import fs from "node:fs";
import path from "node:path";
import type { DebugSession, StoreEvent, StoreListener } from "@/lib/debugStore";

const STORE_VERSION = 1;
const STORE_PATH_ENV = "CP_DEBUG_STORE_PATH";
const MAX_SESSIONS_ENV = "CP_DEBUG_MAX_SESSIONS";

type StoreState = {
  sessions: DebugSession[];
  listeners: Set<StoreListener>;
  initialized: boolean;
  writeQueue: Promise<void>;
};

type GlobalStore = typeof globalThis & {
  __cpdbgStore?: StoreState;
};

const globalStore = globalThis as GlobalStore;

const state: StoreState =
  globalStore.__cpdbgStore ??
  ({
    sessions: [],
    listeners: new Set<StoreListener>(),
    initialized: false,
    writeQueue: Promise.resolve(),
  } satisfies StoreState);

globalStore.__cpdbgStore = state;

function resolveStorePath() {
  const envPath = process.env[STORE_PATH_ENV];
  if (envPath && envPath.trim().length > 0) {
    return envPath;
  }
  return path.join(process.cwd(), "storage", "sessions.json");
}

function getMaxSessions(): number | null {
  const raw = process.env[MAX_SESSIONS_ENV];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function readSessionsFromDisk(filePath: string): DebugSession[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw) return [];

    const parsed = JSON.parse(raw) as
      | { sessions?: DebugSession[] }
      | DebugSession[]
      | null;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && Array.isArray(parsed.sessions)) {
      return parsed.sessions;
    }
  } catch (error) {
    console.error("Failed to load debug sessions", error);
  }

  return [];
}

function ensureLoaded() {
  if (state.initialized) return;

  const filePath = resolveStorePath();
  state.sessions = readSessionsFromDisk(filePath);
  state.initialized = true;
}

async function persistSessions(sessions: DebugSession[]) {
  const filePath = resolveStorePath();
  const directory = path.dirname(filePath);
  await fs.promises.mkdir(directory, { recursive: true });

  const payload = JSON.stringify(
    {
      version: STORE_VERSION,
      updatedAt: new Date().toISOString(),
      sessions,
    },
    null,
    2
  );

  const tempPath = `${filePath}.tmp`;
  await fs.promises.writeFile(tempPath, payload, "utf8");
  await fs.promises.rm(filePath, { force: true });
  await fs.promises.rename(tempPath, filePath);
}

function queuePersist() {
  const snapshot = [...state.sessions];
  state.writeQueue = state.writeQueue
    .then(() => persistSessions(snapshot))
    .catch((error) => {
      console.error("Failed to persist debug sessions", error);
    });
}

function applyRetention(): DebugSession[] {
  const maxSessions = getMaxSessions();
  if (!maxSessions || state.sessions.length <= maxSessions) {
    return [];
  }

  const removeCount = state.sessions.length - maxSessions;
  return state.sessions.splice(0, removeCount);
}

class DebugStore {
  addSession(session: DebugSession) {
    ensureLoaded();

    const existingIndex = state.sessions.findIndex(
      (item) => item.id === session.id
    );

    if (existingIndex >= 0) {
      state.sessions[existingIndex] = session;
    } else {
      state.sessions.push(session);
    }

    this.emit({ type: "add", session });

    const removed = applyRetention();
    removed.forEach((removedSession) => {
      this.emit({ type: "delete", id: removedSession.id });
    });

    queuePersist();
  }

  removeSession(id: string) {
    ensureLoaded();

    const previousLength = state.sessions.length;
    state.sessions = state.sessions.filter((session) => session.id !== id);
    const removed = previousLength !== state.sessions.length;

    if (removed) {
      this.emit({ type: "delete", id });
      queuePersist();
    }

    return removed;
  }

  getSessions() {
    ensureLoaded();
    return [...state.sessions];
  }

  getCounts() {
    ensureLoaded();
    return state.sessions.map((session) =>
      session.entries.map((entry) => entry.content.length)
    );
  }

  subscribe(listener: StoreListener) {
    ensureLoaded();
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  private emit(event: StoreEvent) {
    state.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Failed to notify store listener", error);
      }
    });
  }
}

export const debugStore = new DebugStore();
