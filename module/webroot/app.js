/* Module Reflash Trigger WebUI vNext dev2 */
const MRT = "/data/adb/modules/module-reflash-trigger/bin/mrt";
const state = { modules: [], filter: "needs", lastDryRunWouldTrigger: 0, lastDryRunText: "", bridgeName: "" };

const $ = (id) => document.getElementById(id);
const raw = $("raw");
const modulesEl = $("modules");
const statsEl = $("stats");
const filtersEl = $("filters");
const lastScanEl = $("lastScan");
const bridgeStatusEl = $("bridgeStatus");
const realTriggerBtn = $("realTrigger");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function setRaw(text) {
  raw.textContent = text || "";
}

function bridgeCandidates() {
  return [
    ["ksu.exec", window.ksu && window.ksu.exec],
    ["kernelsu.exec", window.kernelsu && window.kernelsu.exec],
    ["webui.exec", window.webui && window.webui.exec],
    ["apatch.exec", window.apatch && window.apatch.exec],
    ["magisk.exec", window.magisk && window.magisk.exec],
  ];
}

function findBridge() {
  for (const [name, fn] of bridgeCandidates()) {
    if (typeof fn === "function") return { name, fn };
  }
  return null;
}

function formatResult(result) {
  if (typeof result === "string") return result;
  if (result && typeof result.stdout === "string" && result.stdout.length) return result.stdout;
  if (result && typeof result.stderr === "string" && result.stderr.length) return result.stderr;
  return JSON.stringify(result, null, 2);
}

async function execShell(command) {
  const bridge = findBridge();
  if (!bridge) {
    throw new Error("No supported WebUI shell bridge found. Use CLI: " + MRT);
  }
  state.bridgeName = bridge.name;
  bridgeStatusEl.textContent = "Shell bridge: " + bridge.name;
  const result = bridge.fn(command);
  return await Promise.resolve(result);
}

async function run(command) {
  setRaw(`$ ${command}\n\nRunning...`);
  try {
    const result = await execShell(command);
    const text = formatResult(result);
    setRaw(text);
    return text;
  } catch (error) {
    const text = String(error && (error.message || error));
    bridgeStatusEl.textContent = "Shell bridge error";
    setRaw(`$ ${command}\n\nERROR: ${text}`);
    throw error;
  }
}

function readModuleList(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.modules)) return parsed.modules;
  return [];
}

function boolValue(value) {
  return value === true || value === "true";
}

function normalizeStatus(module) {
  const status = module.status || "unknown";
  const marker = boolValue(module.moduleNeedsReflashMarker);
  if (status === "blocked" || boolValue(module.disabled) || boolValue(module.remove_marker) || module.triggerable === false) return "blocked";
  if (marker) return "needs";
  if (status === "fresh") return "fresh";
  if (status === "remote_fingerprint_changed_since_last_fresh") return "drift";
  if (status === "reflash_baseline_unknown") return "unknown";
  if (status === "local_newer_than_remote") return "localNewer";
  return "other";
}

function labelFor(module) {
  const labels = {
    needs: "Needs reflash marker",
    fresh: "Fresh",
    drift: "Fingerprint drift",
    unknown: "Baseline unknown",
    localNewer: "Local newer",
    blocked: "Blocked",
    other: "Other"
  };
  return labels[normalizeStatus(module)] || "Other";
}

function countByGroup(modules) {
  const counts = { all: modules.length, needs: 0, fresh: 0, drift: 0, unknown: 0, localNewer: 0, blocked: 0, other: 0 };
  for (const module of modules) counts[normalizeStatus(module)] = (counts[normalizeStatus(module)] || 0) + 1;
  return counts;
}

function renderStats() {
  const counts = countByGroup(state.modules);
  const cards = [
    ["needs", "Needs reflash", "Manager/module marker"],
    ["fresh", "Fresh", "Baseline matches"],
    ["drift", "Drift", "Diagnostic only"],
    ["unknown", "Unknown", "No baseline yet"],
    ["blocked", "Blocked", "Unsafe target"],
    ["all", "Total", "updateJson-capable"]
  ];
  statsEl.innerHTML = cards.map(([key, title, subtitle]) => `
    <button class="mrt-stat ${state.filter === key ? "active" : ""}" type="button" data-filter="${key}">
      <span>${escapeHtml(title)}</span>
      <strong>${counts[key] || 0}</strong>
      <small>${escapeHtml(subtitle)}</small>
    </button>
  `).join("");
  statsEl.querySelectorAll("button[data-filter]").forEach((button) => {
    button.onclick = () => { state.filter = button.dataset.filter; render(); };
  });
}

function renderFilters() {
  const filters = [
    ["needs", "Needs reflash"], ["fresh", "Fresh"], ["drift", "Drift"],
    ["unknown", "Unknown"], ["localNewer", "Local newer"], ["blocked", "Blocked"], ["all", "All"]
  ];
  filtersEl.innerHTML = filters.map(([key, label]) => `<button class="chip ${state.filter === key ? "active" : ""}" type="button" data-filter="${key}">${escapeHtml(label)}</button>`).join("");
  filtersEl.querySelectorAll("button[data-filter]").forEach((button) => {
    button.onclick = () => { state.filter = button.dataset.filter; render(); };
  });
}

function field(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<div class="field"><span>${escapeHtml(label)}</span><code>${escapeHtml(value)}</code></div>`;
}

function renderModule(module) {
  const group = normalizeStatus(module);
  const triggerable = boolValue(module.triggerable);
  const marker = boolValue(module.moduleNeedsReflashMarker);
  const id = module.id || module.moduleId || "unknown";
  const reason = module.reason || "";
  const markerText = module.moduleNeedsReflashText || "";
  const canSingleTrigger = triggerable && group !== "blocked";

  return `<article class="mrt-card ${escapeHtml(group)}">
    <div class="card-head">
      <div>
        <h3>${escapeHtml(id)}</h3>
        <p>${escapeHtml(module.name || "")}</p>
      </div>
      <span class="badge ${escapeHtml(group)}">${escapeHtml(labelFor(module))}</span>
    </div>
    <div class="fields">
      ${field("status", module.status)}
      ${field("reason", reason)}
      ${field("marker", marker)}
      ${field("triggerable", triggerable)}
      ${field("local", (module.version || "") + " / " + (module.versionCode || ""))}
      ${field("remote", (module.remoteVersion || "") + " / " + (module.remoteCode || ""))}
    </div>
    ${markerText ? `<p class="marker-text">${escapeHtml(markerText)}</p>` : ""}
    <details>
      <summary>updateJson / raw identifiers</summary>
      <div class="fields compact">
        ${field("updateJson", module.updateJson)}
        ${field("remoteFingerprint", module.remoteFingerprint)}
        ${field("freshFingerprint", module.freshFingerprint)}
      </div>
    </details>
    <div class="card-actions">
      <button ${canSingleTrigger ? "" : "disabled"} type="button" data-action="single-trigger" data-id="${escapeHtml(id)}">Trigger this module</button>
      <button type="button" data-action="mark-fresh" data-id="${escapeHtml(id)}">Mark fresh</button>
      <button type="button" data-action="restore" data-id="${escapeHtml(id)}">Restore latest</button>
      <button type="button" data-action="baseline" data-id="${escapeHtml(id)}">Baseline</button>
    </div>
  </article>`;
}

function renderModules() {
  let visible = state.modules;
  if (state.filter !== "all") visible = visible.filter((module) => normalizeStatus(module) === state.filter);
  modulesEl.innerHTML = visible.length ? visible.map(renderModule).join("") : `<div class="empty">No modules in this filter.</div>`;
  modulesEl.querySelectorAll("button[data-action]").forEach((button) => {
    const id = button.dataset.id;
    const q = shellQuote(id);
    if (button.dataset.action === "single-trigger") {
      button.onclick = () => {
        if (confirm(`Prepare ${id} for manager-side reflash? MRT lowers local version/versionCode only.`)) {
          run(`${MRT} trigger --yes ${q}`).then(() => scan(true)).catch(() => {});
        }
      };
    } else if (button.dataset.action === "mark-fresh") {
      button.onclick = () => run(`${MRT} mark-fresh ${q}`).then(() => scan(true)).catch(() => {});
    } else if (button.dataset.action === "restore") {
      button.onclick = () => run(`${MRT} restore-latest ${q}`).then(() => scan(true)).catch(() => {});
    } else if (button.dataset.action === "baseline") {
      button.onclick = () => run(`${MRT} baseline-show --online ${q}`).catch(() => {});
    }
  });
}

function render() {
  renderStats();
  renderFilters();
  renderModules();
  realTriggerBtn.disabled = !(state.lastDryRunWouldTrigger > 0);
}

async function scan(online) {
  const command = `${MRT} ${online ? "scan-online-json" : "scan-json"}`;
  try {
    const text = await run(command);
    state.modules = readModuleList(text);
    lastScanEl.textContent = `${online ? "Online" : "Local"} scan: ${state.modules.length} modules · ${new Date().toLocaleString()}`;
    state.lastDryRunWouldTrigger = 0;
    state.lastDryRunText = "";
  } catch (error) {
    state.modules = [];
    lastScanEl.textContent = "Scan failed. See raw output.";
  }
  render();
}

async function dryRunMarker() {
  const text = await run(`${MRT} trigger-needed --dry-run --mode marker`);
  state.lastDryRunText = text;
  const match = text.match(/trigger_needed_dry_run_would_trigger=(\d+)/);
  state.lastDryRunWouldTrigger = match ? Number(match[1]) : 0;
  realTriggerBtn.disabled = !(state.lastDryRunWouldTrigger > 0);
  return text;
}

function wireUi() {
  $("scanOnline").onclick = () => scan(true);
  $("scanLocal").onclick = () => scan(false);
  $("dryRun").onclick = () => dryRunMarker().catch(() => {});
  $("realTrigger").onclick = () => {
    const n = state.lastDryRunWouldTrigger || 0;
    if (n <= 0) return;
    const ok1 = confirm(`Dry-run found ${n} manager-reported Needs reflash module(s). Continue?`);
    if (!ok1) return;
    const ok2 = confirm("This lowers local version/versionCode only. Your root manager must perform the final online reflash/update. Trigger now?");
    if (ok2) run(`${MRT} trigger-needed --yes --mode marker`).then(() => scan(true)).catch(() => {});
  };
  $("configOff").onclick = () => run(`${MRT} config-auto --disable && ${MRT} config-show`).catch(() => {});
}

wireUi();
const initialBridge = findBridge();
bridgeStatusEl.textContent = initialBridge ? "Shell bridge detected: " + initialBridge.name : "No shell bridge detected yet. Try Scan; otherwise use CLI.";
render();
setTimeout(() => scan(true), 50);
