import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";

type DebugValue = unknown;

type DebugEntry = {
  line: number;
  file?: string;
  content: Array<{ id: string; value: DebugValue }>;
};

type DebugSession = {
  id: string;
  entries: DebugEntry[];
  code?: string;
  file?: string;
};

type SessionStatus = {
  mode: "file" | "http";
  lastUpdated: string | null;
  message?: string;
  source?: string;
};

type Snapshot = {
  sessions: DebugSession[];
  counts: number[][];
  status: SessionStatus;
};

class SessionController {
  private snapshot: Snapshot = {
    sessions: [],
    counts: [],
    status: { mode: "file", lastUpdated: null, message: "" },
  };
  private watcher: vscode.FileSystemWatcher | null = null;
  private poller: NodeJS.Timeout | null = null;
  private emitter = new vscode.EventEmitter<Snapshot>();

  readonly onSnapshot = this.emitter.event;

  async configure() {
    const config = vscode.workspace.getConfiguration("cpDebugger");
    const mode = config.get<string>("mode", "file") === "http" ? "http" : "file";
    const autoRefresh = config.get<boolean>("autoRefresh", true);
    const pollInterval = config.get<number>("pollIntervalMs", 2000);
    const sessionFile = config.get<string>("sessionFile", "debug_output.json");
    const httpEndpoint = config.get<string>("httpEndpoint", "http://localhost:3000/api/debug");

    this.snapshot.status.mode = mode;

    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }

    if (mode === "file" && autoRefresh) {
      const filePath = resolveSessionFile(sessionFile);
      this.snapshot.status.source = filePath;
      this.watcher = createFileWatcher(filePath, () => this.refresh("file-change"));
    }

    if (mode === "http" && autoRefresh) {
      this.snapshot.status.source = httpEndpoint;
      const interval = Math.max(500, pollInterval);
      this.poller = setInterval(() => {
        void this.refresh("poll");
      }, interval);
    }

    await this.refresh("configure");
  }

  getSnapshot() {
    return this.snapshot;
  }

  async refresh(reason: string) {
    const config = vscode.workspace.getConfiguration("cpDebugger");
    const mode = config.get<string>("mode", "file") === "http" ? "http" : "file";
    this.snapshot.status.mode = mode;
    this.snapshot.status.message = reason;

    try {
      if (mode === "file") {
        const sessionFile = config.get<string>("sessionFile", "debug_output.json");
        const filePath = resolveSessionFile(sessionFile);
        this.snapshot.status.source = filePath;
        const sessions = await loadSessionsFromFile(filePath);
        this.applySessions(sessions);
      } else {
        const httpEndpoint = config.get<string>("httpEndpoint", "http://localhost:3000/api/debug");
        this.snapshot.status.source = httpEndpoint;
        const sessions = await loadSessionsFromHttp(httpEndpoint);
        this.applySessions(sessions);
      }

      this.snapshot.status.lastUpdated = new Date().toISOString();
      this.emitter.fire({ ...this.snapshot });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.snapshot.status.message = message;
      this.emitter.fire({ ...this.snapshot });
    }
  }

  private applySessions(sessions: DebugSession[]) {
    this.snapshot.sessions = sessions;
    this.snapshot.counts = sessions.map((session) =>
      session.entries.map((entry) => entry.content.length)
    );
  }
}

class WebviewManager {
  private webviews = new Set<vscode.Webview>();

  constructor(private controller: SessionController) {
    this.controller.onSnapshot((snapshot) => {
      this.broadcast(snapshot);
    });
  }

  attach(webview: vscode.Webview) {
    this.webviews.add(webview);
    void webview.postMessage({ type: "snapshot", payload: this.controller.getSnapshot() });
  }

  detach(webview: vscode.Webview) {
    this.webviews.delete(webview);
  }

  broadcast(snapshot: Snapshot) {
    this.webviews.forEach((webview) => {
      void webview.postMessage({ type: "snapshot", payload: snapshot });
    });
  }
}

class CpDebuggerViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private context: vscode.ExtensionContext,
    private controller: SessionController,
    private manager: WebviewManager
  ) {}

  resolveWebviewView(view: vscode.WebviewView) {
    configureWebview(view.webview, this.context.extensionUri);
    view.webview.html = getWebviewHtml(view.webview, this.context.extensionUri, "CP Debugger");
    this.manager.attach(view.webview);

    view.onDidDispose(() => {
      this.manager.detach(view.webview);
    });

    view.webview.onDidReceiveMessage((message) => {
      if (message?.type === "refresh") {
        void this.controller.refresh("view-refresh");
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const controller = new SessionController();
  const manager = new WebviewManager(controller);

  const viewProvider = new CpDebuggerViewProvider(context, controller, manager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("cpDebugger.sessions", viewProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cpDebugger.open", () => {
      const panel = vscode.window.createWebviewPanel(
        "cpDebugger.panel",
        "CP Debugger",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ],
        }
      );

      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, "CP Debugger Panel");
      manager.attach(panel.webview);

      panel.onDidDispose(() => {
        manager.detach(panel.webview);
      });

      panel.webview.onDidReceiveMessage((message) => {
        if (message?.type === "refresh") {
          void controller.refresh("panel-refresh");
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cpDebugger.refresh", () => controller.refresh("command"))
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("cpDebugger")) {
        void controller.configure();
      }
    })
  );

  void controller.configure();
}

export function deactivate() {
  return undefined;
}

function resolveSessionFile(rawPath: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const baseFolder = workspaceFolder ?? process.cwd();
  let resolved = rawPath;
  if (resolved.includes("${workspaceFolder}") && workspaceFolder) {
    resolved = resolved.replace("${workspaceFolder}", workspaceFolder);
  }
  if (!path.isAbsolute(resolved)) {
    resolved = path.join(baseFolder, resolved);
  }
  return path.normalize(resolved);
}

function createFileWatcher(filePath: string, onChange: () => void) {
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const pattern = new vscode.RelativePattern(directory, fileName);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);

  return watcher;
}

async function loadSessionsFromFile(filePath: string): Promise<DebugSession[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseSessions(raw, `file:${filePath}`);
  } catch (error) {
    return [];
  }
}

async function loadSessionsFromHttp(endpoint: string): Promise<DebugSession[]> {
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching sessions`);
  }
  const body = await response.json();
  if (body && Array.isArray(body.sessions)) {
    return coerceSessions(body.sessions, `http:${endpoint}`);
  }
  return coerceSessions(body, `http:${endpoint}`);
}

function parseSessions(raw: string, sourceId: string): DebugSession[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return coerceSessions(data, sourceId);
  } catch (error) {
    return [];
  }
}

function coerceSessions(data: unknown, sourceId: string): DebugSession[] {
  if (Array.isArray(data)) {
    return data
      .map((item, index) => sanitizeSession(item, `${sourceId}:${index}`))
      .filter((item): item is DebugSession => Boolean(item));
  }

  if (data && typeof data === "object") {
    const maybeSessions = (data as { sessions?: unknown }).sessions;
    if (Array.isArray(maybeSessions)) {
      return maybeSessions
        .map((item, index) => sanitizeSession(item, `${sourceId}:${index}`))
        .filter((item): item is DebugSession => Boolean(item));
    }
  }

  const single = sanitizeSession(data, sourceId);
  return single ? [single] : [];
}

function sanitizeSession(input: unknown, fallbackId: string): DebugSession | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Partial<DebugSession> & { entries?: unknown };
  if (!Array.isArray(record.entries)) return null;

  const entries = record.entries
    .map((entry) => sanitizeEntry(entry))
    .filter((entry): entry is DebugEntry => Boolean(entry));

  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : fallbackId,
    entries,
    code: typeof record.code === "string" ? record.code : undefined,
    file: typeof record.file === "string" ? record.file : undefined,
  };
}

function sanitizeEntry(input: unknown): DebugEntry | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Partial<DebugEntry> & { content?: unknown };
  if (typeof record.line !== "number") return null;

  const content = Array.isArray(record.content)
    ? record.content
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const valueRecord = item as { id?: unknown; value?: unknown };
          if (typeof valueRecord.id !== "string") return null;
          return { id: valueRecord.id, value: valueRecord.value };
        })
        .filter((item): item is { id: string; value: DebugValue } => Boolean(item))
    : [];

  return {
    line: record.line,
    file: typeof record.file === "string" ? record.file : undefined,
    content,
  };
}

function configureWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
  webview.options = {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, "media"),
    ],
  };
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, title: string) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "styles.css")
  );
  const nonce = getNonce();

  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline' https:`,
    `font-src ${webview.cspSource} https: data:`,
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="app">
    <header class="header">
      <div>
        <h1>CP Debugger</h1>
        <small>Sessions, variables, and graphs in one workspace.</small>
      </div>
      <div class="status">
        <span class="status-pill" id="status-text">File mode</span>
        <span id="status-meta">Waiting for sessions</span>
        <button class="button" id="refresh-btn">Refresh</button>
      </div>
    </header>

    <main class="main">
      <section class="panel">
        <div class="panel-header">
          <h2>Sessions</h2>
        </div>
        <div class="panel-body" id="sessions-list"></div>
        <div class="panel-header">
          <h2>Steps</h2>
        </div>
        <div class="panel-body" id="steps-list"></div>
      </section>

      <section class="panel">
        <div class="tabs">
          <button class="tab active" data-tab="graph">Graph</button>
          <button class="tab" data-tab="variables">Variables</button>
          <button class="tab" data-tab="code">Code</button>
        </div>
        <div class="tab-panel" data-tab-panel="graph">
          <div class="section-title">Graph Snapshot</div>
          <div id="graph-container"></div>
        </div>
        <div class="tab-panel" data-tab-panel="variables" style="display:none">
          <div class="section-title">Variables</div>
          <input class="filter-input" id="variable-filter" placeholder="Filter variables" />
          <div id="variables-list"></div>
        </div>
        <div class="tab-panel" data-tab-panel="code" style="display:none">
          <div class="section-title">Source</div>
          <div id="code-container"></div>
        </div>
      </section>
    </main>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
