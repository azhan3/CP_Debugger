(function () {
  const vscode = acquireVsCodeApi();

  const state = {
    sessions: [],
    counts: [],
    status: { mode: "file", lastUpdated: null, message: "" },
    activeSession: 0,
    activeEntry: 0,
    activeTab: "graph",
    selectedGraphId: null,
    selectedGraphPayload: null,
    filterText: "",
  };

  const elements = {
    statusText: document.getElementById("status-text"),
    statusMeta: document.getElementById("status-meta"),
    refreshButton: document.getElementById("refresh-btn"),
    sessionsList: document.getElementById("sessions-list"),
    stepsList: document.getElementById("steps-list"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    tabPanels: document.querySelectorAll("[data-tab-panel]"),
    variablesList: document.getElementById("variables-list"),
    graphContainer: document.getElementById("graph-container"),
    codeContainer: document.getElementById("code-container"),
    filterInput: document.getElementById("variable-filter"),
  };

  function setStatus(snapshot) {
    if (!elements.statusText || !elements.statusMeta) return;
    const modeLabel = snapshot.status?.mode === "http" ? "HTTP" : "File";
    elements.statusText.textContent = `${modeLabel} mode`;
    const updated = snapshot.status?.lastUpdated
      ? new Date(snapshot.status.lastUpdated).toLocaleTimeString()
      : "Not updated";
    elements.statusMeta.textContent = `${updated} · ${snapshot.sessions.length} sessions`;
  }

  function normalizeSessions(payload) {
    state.sessions = payload.sessions ?? [];
    state.counts = payload.counts ?? [];
    state.status = payload.status ?? state.status;
    if (state.activeSession >= state.sessions.length) {
      state.activeSession = Math.max(0, state.sessions.length - 1);
      state.activeEntry = 0;
    }
    ensureEntryBounds();
    autoSelectGraph();
  }

  function ensureEntryBounds() {
    const entryCount = getActiveSession()?.entries?.length ?? 0;
    if (entryCount === 0) {
      state.activeEntry = 0;
      return;
    }
    state.activeEntry = Math.min(state.activeEntry, entryCount - 1);
  }

  function getActiveSession() {
    return state.sessions[state.activeSession] || null;
  }

  function getActiveEntry() {
    const session = getActiveSession();
    if (!session) return null;
    return session.entries[state.activeEntry] || null;
  }

  function autoSelectGraph() {
    const entry = getActiveEntry();
    if (!entry) {
      state.selectedGraphId = null;
      state.selectedGraphPayload = null;
      return;
    }

    const graphVars = entry.content.filter((item) => isGraphPayload(item.value));
    if (graphVars.length === 0) {
      state.selectedGraphId = null;
      state.selectedGraphPayload = null;
      return;
    }

    if (state.selectedGraphId) {
      const match = graphVars.find((item) => item.id === state.selectedGraphId);
      if (match) {
        state.selectedGraphPayload = match.value;
        return;
      }
    }

    state.selectedGraphId = graphVars[0].id;
    state.selectedGraphPayload = graphVars[0].value;
  }

  function renderSessions() {
    if (!elements.sessionsList) return;
    if (state.sessions.length === 0) {
      elements.sessionsList.innerHTML = "<div class=\"graph-empty\">Awaiting sessions...</div>";
      return;
    }

    elements.sessionsList.innerHTML = state.sessions
      .map((session, index) => {
        const fileName = session.file ? session.file.split(/[/\\]/).pop() : `Session ${index + 1}`;
        const isActive = index === state.activeSession;
        const entriesCount = session.entries?.length ?? 0;
        return `
          <div class="session-card ${isActive ? "active" : ""}" data-session="${index}">
            <div>${fileName}</div>
            <div class="session-meta">
              <span>${entriesCount} steps</span>
              <span>${session.id?.slice(0, 8) ?? "local"}</span>
            </div>
          </div>
        `;
      })
      .join("");

    Array.from(elements.sessionsList.querySelectorAll(".session-card")).forEach((card) => {
      card.addEventListener("click", () => {
        const index = Number(card.getAttribute("data-session"));
        if (Number.isNaN(index)) return;
        state.activeSession = index;
        state.activeEntry = 0;
        autoSelectGraph();
        render();
      });
    });
  }

  function compareBlocks(entries, aStart, bStart, length) {
    for (let offset = 0; offset < length; offset += 1) {
      const a = entries[aStart + offset];
      const b = entries[bStart + offset];
      if (!a || !b) return false;
      if (a.line !== b.line || a.file !== b.file) return false;
    }
    return true;
  }

  function detectLoop(entries, start) {
    const base = entries[start];
    if (!base) return null;

    for (let offset = start + 1; offset < entries.length; offset += 1) {
      const candidate = entries[offset];
      if (!candidate) break;
      const sameLocation = candidate.line === base.line && candidate.file === base.file;
      if (!sameLocation) continue;
      const blockLength = offset - start;
      if (blockLength === 0) continue;
      if (!compareBlocks(entries, start, offset, blockLength)) continue;

      let iterationCount = 2;
      let nextStart = offset + blockLength;
      while (nextStart + blockLength <= entries.length && compareBlocks(entries, start, nextStart, blockLength)) {
        iterationCount += 1;
        nextStart += blockLength;
      }

      if (iterationCount >= 2) {
        return { blockLength, iterationCount };
      }
    }

    return null;
  }

  function buildGroups(entries, offset) {
    const groups = [];
    let index = 0;
    while (index < entries.length) {
      const loopInfo = detectLoop(entries, index);
      if (loopInfo) {
        const { blockLength, iterationCount } = loopInfo;
        const iterations = [];
        for (let iteration = 0; iteration < iterationCount; iteration += 1) {
          const iterationStartLocal = index + iteration * blockLength;
          const iterationEndLocal = iterationStartLocal + blockLength;
          const globalStart = offset + iterationStartLocal;
          const globalEnd = offset + iterationEndLocal;
          const nestedEntries = entries.slice(iterationStartLocal + 1, iterationEndLocal);
          const nestedGroups = nestedEntries.length ? buildGroups(nestedEntries, globalStart + 1) : [];
          iterations.push({
            entryIndex: globalStart,
            entry: entries[iterationStartLocal],
            range: { start: globalStart, end: globalEnd },
            groups: nestedGroups,
          });
        }
        groups.push({
          type: "loop",
          line: entries[index].line,
          file: entries[index].file,
          startIndex: offset + index,
          iterations,
        });
        index += blockLength * iterationCount;
        continue;
      }

      const entry = entries[index];
      groups.push({ type: "single", line: entry.line, entryIndex: offset + index, entry });
      index += 1;
    }
    return groups;
  }

  function groupDebugEntries(entries) {
    return buildGroups(entries, 0);
  }

  function renderSteps() {
    if (!elements.stepsList) return;
    const session = getActiveSession();
    if (!session) {
      elements.stepsList.innerHTML = "<div class=\"graph-empty\">No steps yet.</div>";
      return;
    }

    const groups = groupDebugEntries(session.entries);
    const html = groups
      .map((group, index) => {
        if (group.type === "single") {
          const active = group.entryIndex === state.activeEntry ? "active" : "";
          return `<div class="step-item ${active}" data-entry="${group.entryIndex}">Line ${group.line}</div>`;
        }

        const iterationCount = group.iterations.length;
        let activeIterationIndex = group.iterations.findIndex(
          (iteration) => state.activeEntry >= iteration.range.start && state.activeEntry < iteration.range.end
        );
        if (activeIterationIndex === -1) activeIterationIndex = 0;
        const activeIteration = group.iterations[activeIterationIndex];
        return `
          <div class="loop-item" data-loop="${index}">
            <div>Line ${group.line} loop · ${iterationCount} iterations</div>
            <div class="session-meta">Active #${activeIterationIndex + 1}</div>
            <div class="loop-controls">
              <button data-loop-prev="${index}">Prev</button>
              <button data-loop-next="${index}">Next</button>
            </div>
          </div>
        `;
      })
      .join("");

    elements.stepsList.innerHTML = html || "<div class=\"graph-empty\">No steps yet.</div>";

    Array.from(elements.stepsList.querySelectorAll(".step-item")).forEach((item) => {
      item.addEventListener("click", () => {
        const entryIndex = Number(item.getAttribute("data-entry"));
        if (Number.isNaN(entryIndex)) return;
        state.activeEntry = entryIndex;
        autoSelectGraph();
        render();
      });
    });

    Array.from(elements.stepsList.querySelectorAll(".loop-item")).forEach((item) => {
      const groupIndex = Number(item.getAttribute("data-loop"));
      const group = groups[groupIndex];
      if (!group || group.type !== "loop") return;

      const prevButton = item.querySelector("button[data-loop-prev]");
      const nextButton = item.querySelector("button[data-loop-next]");

      if (prevButton) {
        prevButton.addEventListener("click", () => {
          const iterations = group.iterations;
          const currentIndex = iterations.findIndex(
            (iteration) => state.activeEntry >= iteration.range.start && state.activeEntry < iteration.range.end
          );
          const nextIndex = Math.max(0, (currentIndex === -1 ? 0 : currentIndex - 1));
          state.activeEntry = iterations[nextIndex].range.start;
          autoSelectGraph();
          render();
        });
      }

      if (nextButton) {
        nextButton.addEventListener("click", () => {
          const iterations = group.iterations;
          const currentIndex = iterations.findIndex(
            (iteration) => state.activeEntry >= iteration.range.start && state.activeEntry < iteration.range.end
          );
          const nextIndex = Math.min(iterations.length - 1, (currentIndex === -1 ? 0 : currentIndex + 1));
          state.activeEntry = iterations[nextIndex].range.start;
          autoSelectGraph();
          render();
        });
      }
    });
  }

  function renderVariables() {
    if (!elements.variablesList) return;
    const entry = getActiveEntry();
    if (!entry) {
      elements.variablesList.innerHTML = "<div class=\"graph-empty\">No variables for this step.</div>";
      return;
    }

    const query = state.filterText.trim().toLowerCase();
    const content = entry.content.filter((item) => item.id.toLowerCase().includes(query));

    if (content.length === 0) {
      elements.variablesList.innerHTML = "<div class=\"graph-empty\">No variables matched.</div>";
      return;
    }

    elements.variablesList.innerHTML = content
      .map((item, index) => {
        const isGraph = isGraphPayload(item.value);
        const isActive = isGraph && item.id === state.selectedGraphId;
        return `
          <div class="variable-card ${isGraph ? "graph" : ""} ${isActive ? "active" : ""}" data-variable="${index}">
            <div class="variable-name">
              <span>${item.value?.label || item.id}</span>
              ${isGraph ? `<span class="variable-badge">Graph</span>` : ""}
            </div>
            <div class="variable-value">${formatValue(item.value)}</div>
          </div>
        `;
      })
      .join("");

    Array.from(elements.variablesList.querySelectorAll(".variable-card.graph")).forEach((card) => {
      card.addEventListener("click", () => {
        const index = Number(card.getAttribute("data-variable"));
        const item = content[index];
        if (!item || !isGraphPayload(item.value)) return;
        state.selectedGraphId = item.id;
        state.selectedGraphPayload = item.value;
        render();
      });
    });
  }

  function formatValue(value) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value, null, 2);
  }

  function renderCode() {
    if (!elements.codeContainer) return;
    const session = getActiveSession();
    const entry = getActiveEntry();
    const source = session?.code || "";
    if (!source) {
      elements.codeContainer.innerHTML = "<div class=\"graph-empty\">No source code loaded.</div>";
      return;
    }
    const activeLine = entry?.line ?? null;
    const lines = source.split("\n");
    const html = lines
      .map((line, index) => {
        const lineNumber = index + 1;
        const active = activeLine === lineNumber ? "active" : "";
        return `
          <div class="code-line ${active}">
            <span>${lineNumber}</span>
            <div>${escapeHtml(line)}</div>
          </div>
        `;
      })
      .join("");
    elements.codeContainer.innerHTML = `<div class="code-shell">${html}</div>`;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isGraphPayload(value) {
    return isPlainObject(value) && value.__type === "graph";
  }

  function normalizeGraphPayload(payload) {
    if (!payload || !payload.adjacency) return null;
    const adjacency = payload.adjacency;

    if (Array.isArray(adjacency)) {
      const isMapLike = adjacency.every(
        (entry) => Array.isArray(entry) && entry.length === 2 && !Array.isArray(entry[0])
      );
      if (isMapLike) {
        return normalizeMapAdjacency(adjacency);
      }
      return normalizeArrayAdjacency(adjacency) || normalizeMapAdjacency(adjacency);
    }

    if (isPlainObject(adjacency)) {
      return normalizeMapAdjacency(Object.entries(adjacency));
    }

    return null;
  }

  function normalizeArrayAdjacency(adjacency) {
    if (!adjacency.every((item) => Array.isArray(item))) return null;
    const nodeMap = new Map();
    const links = [];
    let weighted = false;

    adjacency.forEach((_, index) => {
      const nodeId = String(index);
      if (!nodeMap.has(nodeId)) nodeMap.set(nodeId, { id: nodeId });
    });

    adjacency.forEach((rawNeighbours, sourceIndex) => {
      const neighbours = rawNeighbours;
      const sourceId = String(sourceIndex);
      if (neighbours.every((item) => typeof item === "number")) {
        neighbours.forEach((target) => {
          const targetId = String(target);
          if (!nodeMap.has(targetId)) nodeMap.set(targetId, { id: targetId });
          links.push({ source: sourceId, target: targetId });
        });
        return;
      }
      if (neighbours.every((item) => Array.isArray(item) && item.length >= 2)) {
        neighbours.forEach((pair) => {
          const targetId = String(pair[0]);
          const weight = pair[1];
          if (!nodeMap.has(targetId)) nodeMap.set(targetId, { id: targetId });
          if (typeof weight === "number") {
            links.push({ source: sourceId, target: targetId, weight });
            weighted = true;
          }
        });
      }
    });

    return { nodes: Array.from(nodeMap.values()), links, weighted };
  }

  function normalizeMapAdjacency(entries) {
    const nodeMap = new Map();
    const links = [];
    let weighted = false;

    entries.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const key = String(entry[0]);
      const neighbours = entry[1];
      if (!nodeMap.has(key)) nodeMap.set(key, { id: key });
      if (!Array.isArray(neighbours)) return;

      if (neighbours.every((item) => typeof item === "number" || typeof item === "string")) {
        neighbours.forEach((target) => {
          const targetId = String(target);
          if (!nodeMap.has(targetId)) nodeMap.set(targetId, { id: targetId });
          links.push({ source: key, target: targetId });
        });
        return;
      }

      if (neighbours.every((item) => Array.isArray(item) && item.length >= 2)) {
        neighbours.forEach((pair) => {
          const targetId = String(pair[0]);
          const weight = pair[1];
          if (!nodeMap.has(targetId)) nodeMap.set(targetId, { id: targetId });
          if (typeof weight === "number") {
            links.push({ source: key, target: targetId, weight });
            weighted = true;
          }
        });
      }
    });

    return { nodes: Array.from(nodeMap.values()), links, weighted };
  }

  function renderGraph() {
    if (!elements.graphContainer) return;
    const payload = state.selectedGraphPayload;
    if (!payload) {
      elements.graphContainer.innerHTML = "<div class=\"graph-empty\">Select a graph variable to visualize.</div>";
      return;
    }

    const normalized = normalizeGraphPayload(payload);
    if (!normalized || normalized.nodes.length === 0) {
      elements.graphContainer.innerHTML = "<div class=\"graph-empty\">Graph payload not recognized.</div>";
      return;
    }

    const containerRect = elements.graphContainer.getBoundingClientRect();
    const width = Math.max(280, Math.floor(containerRect.width));
    const height = Math.max(240, Math.floor(containerRect.height));
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 30;
    const nodes = normalized.nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / normalized.nodes.length;
      return {
        ...node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));

    const links = normalized.links.map((link) => {
      const source = nodeMap.get(String(link.source)) || nodes[0];
      const target = nodeMap.get(String(link.target)) || nodes[0];
      return { ...link, source, target };
    });

    const svg = [
      `<svg class="graph-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <rect width="${width}" height="${height}" rx="12" fill="rgba(15,23,42,0.4)" />`,
      `  <g stroke="rgba(249,115,22,0.45)" stroke-width="1.4">`,
      links
        .map((link) => {
          return `<line x1="${link.source.x}" y1="${link.source.y}" x2="${link.target.x}" y2="${link.target.y}" />`;
        })
        .join(""),
      "  </g>",
      `  <g fill="#facc15" stroke="#111827" stroke-width="1">`,
      nodes
        .map((node) => {
          return `<circle cx="${node.x}" cy="${node.y}" r="8" />`;
        })
        .join(""),
      "  </g>",
      `  <g fill="#f8fafc">`,
      nodes
        .map((node) => {
          return `<text x="${node.x + 10}" y="${node.y + 4}">${escapeHtml(String(node.id))}</text>`;
        })
        .join(""),
      "  </g>",
      "</svg>",
    ].join("\n");

    elements.graphContainer.innerHTML = `<div class="graph-shell">${svg}</div>`;
  }

  function renderTabs() {
    elements.tabs.forEach((tab) => {
      const tabId = tab.getAttribute("data-tab");
      tab.classList.toggle("active", tabId === state.activeTab);
    });

    elements.tabPanels.forEach((panel) => {
      const panelId = panel.getAttribute("data-tab-panel");
      panel.style.display = panelId === state.activeTab ? "block" : "none";
    });
  }

  function render() {
    setStatus({ sessions: state.sessions, status: state.status });
    renderSessions();
    renderSteps();
    renderVariables();
    renderGraph();
    renderCode();
    renderTabs();
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "snapshot") return;
    normalizeSessions(message.payload);
    render();
  });

  if (elements.refreshButton) {
    elements.refreshButton.addEventListener("click", () => {
      vscode.postMessage({ type: "refresh" });
    });
  }

  if (elements.filterInput) {
    elements.filterInput.addEventListener("input", (event) => {
      state.filterText = event.target.value || "";
      renderVariables();
    });
  }

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      if (!tabId) return;
      state.activeTab = tabId;
      renderTabs();
      if (tabId === "graph") renderGraph();
      if (tabId === "code") renderCode();
    });
  });

  render();
})();
