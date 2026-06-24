"use strict";

const MRT = "/data/adb/modules/module-reflash-trigger/bin/mrt";
const $ = (id) => document.getElementById(id);
const state = {
  modules: [],
  filter: "needs",
  selected: new Set(),
  lastDryRunWouldTrigger: 0,
  lastAutoDryRunWouldTrigger: 0,
  lastRaw: ""
};

const rawEl = $("raw");
const statsEl = $("stats");
const modulesEl = $("modules");
const filtersEl = $("filters");
const bridgeStatusEl = $("bridgeStatus");
const lastStatusEl = $("lastStatus");
const autoIdsEl = $("autoIds");

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function bridgeCandidates() {
  const w = window;
  const candidates = [];
  const add = (name, obj, method) => {
    if (obj && typeof obj[method] === "function") candidates.push({ name, obj, method });
  };
  add("ksu.exec", w.ksu, "exec");
  add("kernelsu.exec", w.kernelsu, "exec");
  add("webui.exec", w.webui, "exec");
  add("apatch.exec", w.apatch, "exec");
  add("magisk.exec", w.magisk, "exec");
  return candidates;
}

function findBridge() {
  const found = bridgeCandidates();
  return found.length ? found[0] : null;
}

function normalizeBridgeResult(result) {
  if (result == null) return "";
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    if (typeof result.stdout === "string" || typeof result.stderr === "string") {
      return [result.stdout || "", result.stderr || ""].filter(Boolean).join("\n");
    }
    if (typeof result.result === "string") return result.result;
    try { return JSON.stringify(result, null, 2); } catch (_) { return String(result); }
  }
  return String(result);
}

function callBridgeMethod(bridge, cmd) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(normalizeBridgeResult(value));
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    try {
      // Important: call the Java bridge method on the injected object. Do not detach the method,
      // otherwise Android WebView can throw: "Java bridge method can't be invoked on a non-injected object".
      let result;
      if (bridge.obj[bridge.method].length >= 2) {
        result = bridge.obj[bridge.method](cmd, finish);
      } else {
        result = bridge.obj[bridge.method](cmd);
      }
      if (result && typeof result.then === "function") result.then(finish).catch(fail);
      else if (result !== undefined) finish(result);
      else setTimeout(() => finish(""), 250);
    } catch (err) {
      fail(err);
    }
  });
}

async function run(cmd, options = {}) {
  rawEl.textContent = "$ " + cmd + "\n\n…running";
  lastStatusEl.textContent = options.status || "Running command…";
  const bridge = findBridge();
  if (!bridge) {
    bridgeStatusEl.textContent = "No shell bridge detected. Open through a root manager WebUI, or use CLI.";
    rawEl.textContent = "$ " + cmd + "\n\nERROR: No supported shell bridge detected.";
    throw new Error("No shell bridge detected");
  }
  bridgeStatusEl.textContent = "Shell bridge detected: " + bridge.name;
  try {
    const output = await callBridgeMethod(bridge, cmd);
    state.lastRaw = output;
    rawEl.textContent = "$ " + cmd + "\n\n" + output;
    lastStatusEl.textContent = "Command completed.";
    return output;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    rawEl.textContent = "$ " + cmd + "\n\nERROR invoking " + bridge.name + ": " + msg;
    lastStatusEl.textContent = "Shell bridge error";
    throw err;
  }
}

function parseJsonArray(text) {
  const trimmed = String(text || "").trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("No JSON array in output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function normalizeStatus(module) {
  if (!module) return "unknown";
  if (module.self || module.disabled || module.removeMarker || module.status === "blocked") return "blocked";
  if (module.status === "local_newer_than_remote") return "local_newer";
  if (module.moduleNeedsReflashMarker && module.needs_reflash) return "needs";
  if (module.status === "fresh") return "fresh";
  if (module.needs_reflash || module.reason === "remote_fingerprint_changed_since_last_fresh") return "drift";
  if (module.status === "reflash_baseline_unknown") return "unknown";
  return module.status || "unknown";
}

function counts() {
  const c = { needs: 0, fresh: 0, drift: 0, unknown: 0, local_newer: 0, blocked: 0, total: state.modules.length };
  for (const m of state.modules) {
    const s = normalizeStatus(m);
    if (Object.prototype.hasOwnProperty.call(c, s)) c[s] += 1;
    else c.unknown += 1;
  }
  return c;
}

function renderStats() {
  const c = counts();
  const items = [
    ["needs", "Needs reflash", c.needs, "Manager/module marker"],
    ["fresh", "Fresh", c.fresh, "Baseline matches"],
    ["drift", "Drift", c.drift, "Diagnostic only"],
    ["unknown", "Unknown", c.unknown, "No baseline yet"],
    ["local_newer", "Local newer", c.local_newer, "No trigger"],
    ["blocked", "Blocked", c.blocked, "Unsafe target"],
    ["all", "Total", c.total, "updateJson-capable"]
  ];
  statsEl.innerHTML = items.map(([key, label, value, hint]) => `
    <button class="mrt-stat ${state.filter === key ? "active" : ""}" data-filter="${key}">
      <span>${label}</span><strong>${value}</strong><small>${hint}</small>
    </button>
  `).join("");
  statsEl.querySelectorAll("button[data-filter]").forEach((button) => {
    button.onclick = () => { state.filter = button.dataset.filter; render(); };
  });
}

function renderFilters() {
  const filters = [
    ["needs", "Needs reflash"], ["fresh", "Fresh"], ["drift", "Drift"],
    ["unknown", "Unknown"], ["local_newer", "Local newer"], ["blocked", "Blocked"], ["all", "All"]
  ];
  filtersEl.innerHTML = filters.map(([key, label]) => `<button class="chip ${state.filter === key ? "active" : ""}" data-filter="${key}">${label}</button>`).join("");
  filtersEl.querySelectorAll("button[data-filter]").forEach((button) => {
    button.onclick = () => { state.filter = button.dataset.filter; render(); };
  });
}

function badge(module) {
  const s = normalizeStatus(module);
  const text = {
    needs: "Needs reflash", fresh: "Fresh", drift: "Drift", unknown: "Unknown",
    local_newer: "Local newer", blocked: "Blocked"
  }[s] || s;
  return `<span class="badge ${s}">${text}</span>`;
}

function field(label, value) {
  const safe = value == null || value === "" ? "—" : String(value);
  return `<div class="field"><span>${label}</span><code>${safe}</code></div>`;
}

function selectedAttr(id) {
  return state.selected.has(id) ? "checked" : "";
}

function renderModule(module) {
  const s = normalizeStatus(module);
  const canTrigger = module.triggerable && !module.self && !module.disabled && !module.removeMarker;
  const selected = selectedAttr(module.id);
  return `<article class="mrt-card ${s}" data-id="${module.id}">
    <div class="card-head">
      <label class="select-line"><input type="checkbox" class="select-module" data-id="${module.id}" ${selected}> select</label>
      ${badge(module)}
    </div>
    <h3>${module.name || module.id}</h3>
    <p class="module-id">${module.id}</p>
    <div class="fields compact">
      ${field("Version", module.version + " / " + module.versionCode)}
      ${field("Remote", (module.remoteVersion || "") + (module.remoteCode ? " / " + module.remoteCode : ""))}
      ${field("Reason", module.reason)}
      ${field("Marker", module.moduleNeedsReflashMarker ? "true" : "false")}
      ${module.moduleNeedsReflashText ? `<div class="marker-text">${module.moduleNeedsReflashText}</div>` : ""}
    </div>
    <details>
      <summary>updateJson</summary>
      <code class="url">${module.updateJson || "—"}</code>
    </details>
    <div class="card-actions">
      <button data-action="status" data-id="${module.id}">Status online</button>
      <button data-action="trigger" data-id="${module.id}" class="danger" ${canTrigger ? "" : "disabled"}>Trigger this module</button>
      <button data-action="fresh" data-id="${module.id}">Mark fresh</button>
      <button data-action="freshCached" data-id="${module.id}">Mark fresh cached</button>
      <button data-action="baseline" data-id="${module.id}">Baseline</button>
      <button data-action="clear" data-id="${module.id}">Clear baseline</button>
      <button data-action="restore" data-id="${module.id}">Restore latest</button>
    </div>
  </article>`;
}

function bindModuleActions() {
  modulesEl.querySelectorAll(".select-module").forEach((box) => {
    box.onchange = () => {
      if (box.checked) state.selected.add(box.dataset.id);
      else state.selected.delete(box.dataset.id);
      syncAutoIdsFromSelection(false);
    };
  });
  modulesEl.querySelectorAll("button[data-action]").forEach((button) => {
    const id = button.dataset.id;
    const quoted = shellQuote(id);
    button.onclick = async () => {
      const action = button.dataset.action;
      if (action === "status") return run(`${MRT} status-online ${quoted}`, { status: "Reading module status…" });
      if (action === "baseline") return run(`${MRT} baseline-show --online ${quoted}`, { status: "Reading baseline…" });
      if (action === "fresh") {
        if (!confirm(`Mark ${id} fresh using online metadata?`)) return;
        return run(`${MRT} mark-fresh ${quoted}`, { status: "Marking fresh…" });
      }
      if (action === "freshCached") {
        if (!confirm(`Mark ${id} fresh from cached/pending fingerprint?`)) return;
        return run(`${MRT} mark-fresh --cached ${quoted}`, { status: "Marking cached fresh…" });
      }
      if (action === "clear") {
        if (!confirm(`Clear MRT baseline for ${id}? This does not touch module.prop.`)) return;
        return run(`${MRT} clear-baseline ${quoted}`, { status: "Clearing baseline…" });
      }
      if (action === "restore") {
        if (!confirm(`Restore latest MRT backup for ${id}?`)) return;
        return run(`${MRT} restore-latest ${quoted}`, { status: "Restoring module.prop backup…" });
      }
      if (action === "trigger") {
        const ok = confirm(`Trigger ${id}?\n\nThis lowers local version/versionCode so your manager can offer its normal online reflash/update. MRT will not download or install ZIPs.`);
        if (!ok) return;
        const really = confirm(`Final confirmation: prepare ${id} for manager-side reflash now?`);
        if (!really) return;
        return run(`${MRT} trigger --yes ${quoted}`, { status: "Triggering selected module…" });
      }
    };
  });
}

function renderModules() {
  let visible = state.modules.slice();
  if (state.filter !== "all") visible = visible.filter((module) => normalizeStatus(module) === state.filter);
  modulesEl.innerHTML = visible.length ? visible.map(renderModule).join("") : `<div class="empty">No modules in this filter.</div>`;
  bindModuleActions();
}

function render() {
  renderStats();
  renderFilters();
  renderModules();
}

async function scan(online) {
  try {
    const out = await run(`${MRT} ${online ? "scan-online-json" : "scan-json"}`, { status: online ? "Scanning online…" : "Scanning local…" });
    state.modules = parseJsonArray(out);
    state.lastDryRunWouldTrigger = 0;
    state.lastAutoDryRunWouldTrigger = 0;
    $("needsTrigger").disabled = true;
    $("autoRun").disabled = true;
    lastStatusEl.textContent = `Scan complete: ${state.modules.length} modules.`;
    render();
  } catch (err) {
    lastStatusEl.textContent = "Scan failed. See raw output.";
    render();
  }
}

function dryRunCount(output, key) {
  const match = String(output || "").match(new RegExp(key + "=([0-9]+)"));
  return match ? Number(match[1]) : 0;
}

function selectedIds() {
  return [...state.selected].filter(Boolean);
}

function textAreaIds() {
  return autoIdsEl.value.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

function syncAutoIdsFromSelection(overwrite = true) {
  if (!overwrite && autoIdsEl.value.trim()) return;
  autoIdsEl.value = selectedIds().join(" ");
}

$("scanOnline").onclick = () => scan(true);
$("scanLocal").onclick = () => scan(false);
$("needsDry").onclick = async () => {
  const out = await run(`${MRT} trigger-needed --dry-run --mode marker`, { status: "Dry-running marker action…" });
  state.lastDryRunWouldTrigger = dryRunCount(out, "trigger_needed_dry_run_would_trigger");
  $("needsTrigger").disabled = state.lastDryRunWouldTrigger < 1;
};
$("needsTrigger").onclick = async () => {
  if (state.lastDryRunWouldTrigger < 1) return;
  if (!confirm(`Trigger ${state.lastDryRunWouldTrigger} manager-reported Needs reflash module(s)?`)) return;
  if (!confirm("Final confirmation: this lowers version/versionCode for eligible modules. Continue?")) return;
  await run(`${MRT} trigger-needed --yes --mode marker`, { status: "Triggering marker modules…" });
  await scan(false);
};
$("configShow").onclick = () => run(`${MRT} config-show`, { status: "Reading config…" });
$("configOff").onclick = () => run(`${MRT} config-auto --disable && ${MRT} config-show`, { status: "Disabling auto…" });
$("autoDisable2").onclick = () => run(`${MRT} config-auto --disable && ${MRT} config-show`, { status: "Disabling auto…" });
$("autoFromSelected").onclick = () => syncAutoIdsFromSelection(true);
$("autoEnable").onclick = async () => {
  const ids = textAreaIds();
  if (!ids.length) { alert("Choose or type at least one module ID for the auto allowlist."); return; }
  if (!confirm("Enable auto mode for allowlisted module IDs only? This writes MRT config but does not trigger immediately.")) return;
  await run(`${MRT} config-auto --enable ${ids.map(shellQuote).join(" ")} && ${MRT} config-show`, { status: "Enabling auto allowlist…" });
};
$("autoDry").onclick = async () => {
  const out = await run(`${MRT} auto-trigger --dry-run`, { status: "Auto dry-run…" });
  state.lastAutoDryRunWouldTrigger = dryRunCount(out, "auto_trigger_dry_run_would_trigger");
  $("autoRun").disabled = state.lastAutoDryRunWouldTrigger < 1;
};
$("autoRun").onclick = async () => {
  if (state.lastAutoDryRunWouldTrigger < 1) return;
  if (!confirm(`Run auto-trigger for ${state.lastAutoDryRunWouldTrigger} allowlisted module(s)?`)) return;
  if (!confirm("Final confirmation: auto-trigger lowers version/versionCode for allowlisted eligible modules. Continue?")) return;
  await run(`${MRT} auto-trigger --yes`, { status: "Running auto-trigger…" });
  await scan(false);
};
$("selectedFresh").onclick = async () => {
  const ids = selectedIds();
  if (!ids.length) { alert("Select one or more modules first."); return; }
  if (!confirm(`Mark ${ids.length} selected module(s) fresh online?`)) return;
  await run(ids.map((id) => `${MRT} mark-fresh ${shellQuote(id)}`).join(" && "), { status: "Marking selected fresh…" });
  await scan(false);
};
$("selectedClear").onclick = async () => {
  const ids = selectedIds();
  if (!ids.length) { alert("Select one or more modules first."); return; }
  if (!confirm(`Clear MRT baselines for ${ids.length} selected module(s)?`)) return;
  await run(`${MRT} clear-baseline ${ids.map(shellQuote).join(" ")}`, { status: "Clearing selected baselines…" });
  await scan(false);
};

const initialBridge = findBridge();
bridgeStatusEl.textContent = initialBridge ? "Shell bridge detected: " + initialBridge.name : "No shell bridge detected yet. Try Scan; otherwise use CLI.";
render();
scan(true);
