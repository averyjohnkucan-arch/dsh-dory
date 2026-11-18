// Generated from client/ by npm run build. Edit the source modules.
window.__ModuleLoader__.load({id:'dsh-dory',factory(require){
const module={exports:{}};const exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/main.jsx
var main_exports = {};
__export(main_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(main_exports);

// client/EngineHeader.jsx
var import_react = __toESM(require("react"), 1);

// client/engine-panel.css
var engine_panel_default = '.dsh-engine-panel[class] {\n  box-sizing: border-box;\n  margin-top: 16px;\n  padding: 18px;\n  min-width: 0;\n  border: 1px solid var(--dsw-alias-border-l3, currentColor);\n  border-radius: 12px;\n  background: var(--dsw-alias-settings-card-fill, transparent);\n  color: var(--dsw-alias-label-primary, inherit);\n  font: inherit;\n}\n.dsh-engine-panel .dsh-engine-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 12px;\n  padding-bottom: 12px;\n  margin-bottom: 14px;\n  border-bottom: 1px solid var(--dsw-alias-border-l3, currentColor);\n}\n.dsh-engine-header h3 {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 650;\n}\n.dsh-engine-panel .dsh-engine-header h3 small {\n  display: inline;\n  font-size: 0.8rem;\n  font-weight: 400;\n  color: var(--dsw-alias-label-secondary, inherit);\n}\n.dsh-engine-status {\n  margin-top: 4px;\n  font-size: 0.875rem;\n  color: var(--dsw-alias-label-secondary, inherit);\n}\n.dsh-engine-panel[class] button,\n.dsh-engine-panel[class] select,\n.dsh-engine-panel[class]\n  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) {\n  border-radius: 7px;\n  padding: 7px 10px;\n  font: inherit;\n  border: 1px solid var(--dsw-alias-border-l3, currentColor);\n}\n.dsh-engine-panel button:focus-visible,\n.dsh-engine-panel input:focus-visible,\n.dsh-engine-panel select:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}\n/* First model */\n.dsh-engine-panel .dsh-engine-guide {\n  margin: 0 0 12px;\n}\n.dsh-engine-guide summary {\n  cursor: pointer;\n}\n.dsh-engine-guide li {\n  margin: 5px 0;\n}\n';

// package.json
var package_default = {
  name: "dsh-dory",
  version: "0.2.3-rc4.1",
  description: "Dory local models with portable configs, native memory fitting and persistent conversation checkpoints for DeepSeek Harness.",
  type: "module",
  license: "MIT",
  engines: {
    node: ">=24.9.0",
    dsh: "0.2.2-rc.4"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/averyjohnkucan-arch/dsh-dory.git"
  },
  exports: {
    ".": "./index.js",
    "./client": "./client.js"
  },
  files: [
    "index.js",
    "client.js",
    "lib",
    "cordis.patch.yml",
    "README.md",
    "LICENSE",
    "docs",
    "scripts",
    "lib/recommended-models.mjs",
    "lib/recommended-models.json",
    "COMPATIBILITY.md"
  ],
  scripts: {
    test: "node --test test/*.test.js",
    check: "node --check index.js && node --check client.js && node --check lib/runtime.js",
    "build:engine": "node scripts/build-engine.js",
    build: "node build.mjs"
  },
  peerDependencies: {
    "@deepseek-ai/cordis": "~4.1.0",
    "@deepseek-ai/dsh-llm": "0.2.2-rc.4",
    "@deepseek-ai/dsh-llm-pi-ai": "0.2.2-rc.4",
    "@deepseek-ai/schemastery": "~3.19.0",
    "@earendil-works/pi-ai": "1.3.0"
  },
  dsh: {
    bundle: {
      patch: "./cordis.patch.yml"
    },
    client: {
      platform: "web",
      immediately: true,
      inject: [
        "@deepseek-ai/dsh-client-ui-settings-models"
      ]
    }
  },
  devDependencies: {
    "@deepseek-ai/cordis": "~4.1.0",
    "@deepseek-ai/dsh-llm": "0.2.2-rc.4",
    "@deepseek-ai/dsh-llm-pi-ai": "0.2.2-rc.4",
    "@deepseek-ai/schemastery": "~3.19.0",
    "@earendil-works/pi-ai": "1.3.0",
    react: "19.2.0",
    "react-dom": "19.2.0",
    jsdom: "26.1.0",
    esbuild: "0.28.2"
  }
};

// client/first-run.json
var first_run_default = [
  "Choose Import files and select a GGUF or a model folder.",
  "Open Settings for a complete Dory model and save the profile.",
  "Select the saved name in chat."
];

// client/EngineHeader.jsx
function EngineHeader({ name, status, children }) {
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("header", { className: "dsh-engine-header" }, /* @__PURE__ */ import_react.default.createElement("style", null, engine_panel_default), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h3", null, name, " ", /* @__PURE__ */ import_react.default.createElement("small", null, package_default.version)), /* @__PURE__ */ import_react.default.createElement("div", { className: "dsh-engine-status" }, status)), children), /* @__PURE__ */ import_react.default.createElement("details", { className: "dsh-engine-guide" }, /* @__PURE__ */ import_react.default.createElement("summary", null, "Set up your first model"), /* @__PURE__ */ import_react.default.createElement("ol", null, first_run_default.map((step) => /* @__PURE__ */ import_react.default.createElement("li", { key: step }, step)))));
}

// client/main.jsx
var import_react2 = __toESM(require("react"), 1);
var h = import_react2.default.createElement;
var { useState, useEffect, useRef } = import_react2.default;
var plugin = {
  inject: ["slots"],
  apply(ctx) {
    function RecommendedModels({ request, onUse }) {
      const [catalog, setCatalog] = import_react2.default.useState(null), [error, setError] = import_react2.default.useState(""), [busy, setBusy] = import_react2.default.useState(false);
      import_react2.default.useEffect(() => {
        let live = true;
        const refresh = () => request("recommended").then((value) => {
          if (live) {
            setCatalog(value);
            setError("");
          }
        }).catch((e) => {
          if (live) setError(e.message);
        });
        refresh();
        const timer = setInterval(refresh, 2e3);
        return () => {
          live = false;
          clearInterval(timer);
        };
      }, []);
      async function run(action, payload) {
        setBusy(true);
        setError("");
        try {
          await request(action, payload);
          setCatalog(await request("recommended"));
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }
      return h(
        "details",
        {
          "aria-label": "Recommended models",
          style: {
            margin: "16px 0",
            padding: 12,
            border: "1px solid var(--dsw-alias-border-l3)",
            borderRadius: 8
          }
        },
        h(
          "summary",
          null,
          "Recommended models \xB7 exact revisions and hashes"
        ),
        h(
          "p",
          null,
          "Download the official GGUF or select your existing BF16 conversion. Files are verified before use. Downloads do not load a model."
        ),
        error && h("p", { role: "alert" }, error),
        !catalog && h("p", null, "Loading recommendations\u2026"),
        catalog?.models.map((model) => {
          const job = catalog.jobs.filter((j) => j.modelId === model.id).at(-1), downloadable = model.files.length > 0 && model.files.every((f) => f.downloadable);
          return h(
            "div",
            {
              key: model.id,
              style: { margin: "14px 0", overflowWrap: "anywhere" }
            },
            h("strong", null, "Recommended \xB7 " + model.name),
            h("p", null, model.notes),
            model.revision && h("code", null, model.revision),
            h(
              "details",
              null,
              h("summary", null, "Files, sizes and exact identities"),
              model.files.map(
                (f, i) => h(
                  "div",
                  { key: i, style: { margin: "8px 0" } },
                  h(
                    "div",
                    null,
                    f.name + (f.size ? " \xB7 " + (f.size / 1073741824).toFixed(2) + " GiB" : "")
                  ),
                  f.repo && h("div", null, f.repo + " @ " + f.revision),
                  h(
                    "code",
                    null,
                    f.sha256 ? "SHA-256 " + f.sha256 : f.gitBlob ? "Git blob " + f.gitBlob : "Revision " + (f.revision || "Local file; select through importer")
                  ),
                  !f.downloadable && h(
                    "p",
                    null,
                    "Local conversion or assembled component; import the existing file."
                  )
                )
              )
            ),
            downloadable && h(
              "button",
              {
                type: "button",
                disabled: busy || catalog.jobs.some((j) => j.status === "running"),
                onClick: () => run("recommendedDownload", { id: model.id })
              },
              "Download / verify recommended"
            ),
            onUse && h(
              "button",
              {
                type: "button",
                disabled: busy || job?.status === "running",
                onClick: () => Promise.resolve(
                  onUse(model, job?.status === "complete" ? job : null)
                ).catch((e) => setError(e.message))
              },
              job?.status === "complete" ? "Add downloaded files" : "Add existing model"
            ),
            !downloadable && h(
              "p",
              null,
              "This set needs existing local files or the setup command described above."
            ),
            job && h(
              "div",
              { role: "status" },
              job.status + " \xB7 " + job.progress + (job.total ? " \xB7 " + Math.min(
                100,
                Math.floor(job.received / job.total * 100)
              ) + "%" : ""),
              job.directory && h("code", { style: { display: "block" } }, job.directory),
              job.status === "running" && h(
                "button",
                {
                  type: "button",
                  onClick: () => run("recommendedCancel", { id: job.id })
                },
                "Cancel download"
              )
            )
          );
        })
      );
    }
    const css = `
   .dsh-dory-card{margin-top:16px;padding:18px;border:1px solid var(--dsw-alias-border-l3,#555);border-radius:12px;color:inherit}
   .dsh-dory-card button,.dsh-dory-card input,.dsh-dory-card select,.dsh-dory-card textarea{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-1,transparent);border:1px solid var(--dsw-alias-border-l3,#666);border-radius:7px;padding:8px;min-width:0}
   .dsh-dory-card button{cursor:pointer}.dsh-dory-card button:disabled{opacity:.5;cursor:default}.dsh-dory-card input,.dsh-dory-card select{width:100%;box-sizing:border-box}
   .dsh-dory-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.dsh-dory-header{display:flex;justify-content:space-between;gap:12px;align-items:center}
   .dsh-dory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0}.dsh-dory-field{display:flex;flex-direction:column;gap:6px}
   .dsh-dory-row{padding:14px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#555)}.dsh-dory-row p{margin:6px 0 12px;opacity:.8}
   .dsh-dory-card textarea{width:100%;min-height:100px;box-sizing:border-box}.dsh-dory-card pre{white-space:pre-wrap;overflow:auto;max-height:260px;font-size:.85em}
   .dsh-dory-card small{opacity:.75}.dsh-dory-card table{width:100%;text-align:left;font-size:.9em;border-collapse:collapse}.dsh-dory-card td,.dsh-dory-card th{padding:8px 4px;overflow-wrap:anywhere}
   .dsh-dory-error{color:var(--dsw-alias-state-error-primary,#ef8686)}.dsh-dory-browser{margin:16px 0;border:1px solid var(--dsw-alias-border-l3,#555);border-radius:8px;padding:12px}
   .dsh-dory-browser-list{display:flex;flex-direction:column;gap:5px;max-height:270px;overflow:auto;margin:12px 0}.dsh-dory-browser-list button{text-align:left}
   .dsh-dory-card :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#58c)}
  `;
    const button = (label, onClick, disabled = false) => h("button", { type: "button", onClick, disabled }, label);
    const rates = (metrics) => h(
      "div",
      { className: "dsh-dory-actions" },
      h(
        "strong",
        null,
        "Prefill ",
        Number.isFinite(metrics?.prefill) ? metrics.prefill.toFixed(1) + " tok/s" : "Measuring\u2026"
      ),
      h(
        "strong",
        null,
        "Decode ",
        Number.isFinite(metrics?.decode) ? metrics.decode.toFixed(1) + " tok/s" : "Measuring\u2026"
      )
    );
    function Card() {
      const [data, setData] = useState(null), [draft, setDraft] = useState(null), [tab, setTab] = useState("Models");
      const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
      const [browser, setBrowser] = useState(null), [config, setConfig] = useState(""), [scan, setScan] = useState(null);
      const [lastFolder, setLastFolder] = useState("");
      const downloads = useRef(/* @__PURE__ */ new Set()), requestedExports = useRef(/* @__PURE__ */ new Set());
      async function request(action, payload = {}) {
        const cap = window.__DSH_DORY__;
        if (!cap)
          throw Error(
            "Dory plugin connection is unavailable. Reload DSH after installing."
          );
        const response = await fetch(cap.path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + cap.token
          },
          body: JSON.stringify({ action, payload })
        });
        const body = await response.json();
        if (!response.ok || body.error)
          throw Error(body.error || "Dory request failed.");
        return body.result;
      }
      useEffect(() => {
        let live = true;
        const refresh = () => request("list").then((value) => {
          if (live) setData(value);
        }).catch((e) => {
          if (live) setError(e.message);
        });
        refresh();
        const timer = setInterval(refresh, 2e3);
        return () => {
          live = false;
          clearInterval(timer);
        };
      }, []);
      useEffect(() => {
        for (const job of data?.jobs || []) {
          if (job.kind === "Scan model folders" && job.status === "complete")
            setScan(job.result);
          if (job.kind === "Export config" && job.status === "complete" && requestedExports.current.has(job.id) && !downloads.current.has(job.id)) {
            downloads.current.add(job.id);
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(job.result, null, 2) + "\n"], {
                type: "application/json"
              })
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = job.result.name.replace(/[^a-zA-Z0-9._-]+/g, "-") + ".dsh-model.json";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1e3);
          }
        }
      }, [data]);
      async function perform(action, payload = {}) {
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const result = await request(action, payload);
          if (action === "exportConfig" && result?.id)
            requestedExports.current.add(result.id);
          setData(await request("list"));
          return result;
        } catch (e) {
          setError(e.message);
          return null;
        } finally {
          setBusy(false);
        }
      }
      async function openBrowser(target, path = lastFolder) {
        const result = await perform("browse", { path });
        if (result) setBrowser({ ...result, target, input: result.path });
      }
      async function choose(path, directory = false) {
        const target = browser.target;
        if (directory) {
          await openBrowser(target, path);
          return;
        }
        if (target === "modelPath" || target === "executable") {
          setDraft((p) => ({ ...p, [target]: path }));
          setBrowser(null);
        } else if (target === "config") {
          setConfig(path);
          await openBrowser("configRoot");
        } else if (target === "import") {
          await perform("importModel", { path });
          setBrowser(null);
          setTab("Models");
        }
      }
      async function chooseDirectory() {
        const { target, path } = browser;
        setLastFolder(path);
        setBrowser(null);
        if (target === "configRoot") {
          await perform("importConfig", { configPath: config, root: path });
          setTab("Activity");
        } else {
          await perform("scan", { path });
          setTab("Files");
        }
      }
      async function save(benchmark = false) {
        const value = await perform("save", draft);
        if (value) {
          setDraft(null);
          setBrowser(null);
          setNotice("Model settings saved.");
          if (benchmark) {
            await perform("benchmark", { id: value.id });
            setTab("Activity");
          }
        }
      }
      const working = busy || data?.jobs?.some((j) => ["running", "queued"].includes(j.status));
      const jobs = data?.jobs || [], latest = jobs.at(-1);
      const edit = (key, value) => setDraft((p) => ({
        ...p,
        [key]: value,
        ...key === "context" ? { maxTokens: Math.min(p.maxTokens, value) } : {}
      }));
      const field = (key, label, type = "text") => h(
        "label",
        { className: "dsh-dory-field", key },
        label,
        h("input", {
          "aria-label": label,
          type,
          value: draft[key] ?? "",
          disabled: busy,
          onChange: (e) => edit(
            key,
            type === "number" ? Number(e.target.value) : e.target.value
          )
        })
      );
      const select = (key, label, values) => h(
        "label",
        { className: "dsh-dory-field", key },
        label,
        h(
          "select",
          {
            "aria-label": label,
            value: draft[key],
            disabled: busy,
            onChange: (e) => edit(
              key,
              ["context", "loops"].includes(key) ? Number(e.target.value) : e.target.value
            )
          },
          values.map(
            ([value, label2]) => h("option", { key: value, value }, label2)
          )
        )
      );
      const check = (key, label) => h(
        "label",
        { style: { display: "block", margin: "12px 0" } },
        h("input", {
          type: "checkbox",
          style: { width: "auto" },
          checked: draft[key],
          onChange: (e) => edit(key, e.target.checked)
        }),
        " " + label
      );
      function browserView() {
        if (!browser) return null;
        const folder = ["import", "configRoot"].includes(browser.target);
        const title = browser.target === "config" ? "Select model config" : browser.target === "configRoot" ? "Find the matching model files" : browser.target === "executable" ? "Select Dory server" : "Select model files or scan a folder";
        return h(
          "div",
          { className: "dsh-dory-browser", "aria-label": title },
          h("strong", null, title),
          h(
            "p",
            null,
            folder ? "Choose a folder. Subfolders are included; model files stay where they are." : "Choose a file below."
          ),
          h(
            "div",
            { className: "dsh-dory-actions" },
            h("input", {
              "aria-label": "Folder path",
              value: browser.input,
              onChange: (e) => setBrowser((b) => ({ ...b, input: e.target.value })),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openBrowser(browser.target, browser.input);
                }
              }
            }),
            button(
              "Open folder",
              () => openBrowser(browser.target, browser.input),
              busy
            )
          ),
          h(
            "div",
            { className: "dsh-dory-actions", style: { marginTop: 8 } },
            button(
              "\u2191 Parent folder",
              () => openBrowser(browser.target, browser.parent),
              busy
            ),
            folder && button(
              browser.target === "configRoot" ? "Find and import config" : "Scan this folder",
              chooseDirectory,
              busy
            ),
            button("Close browser", () => setBrowser(null))
          ),
          h(
            "div",
            { className: "dsh-dory-browser-list" },
            browser.entries.filter(
              (f) => f.directory || (browser.target === "config" ? /\.json$/i.test(f.name) : browser.target === "executable" ? /llama-server(?:\.exe)?$/.test(f.name) : browser.target === "configRoot" ? false : /\.gguf$/i.test(f.name))
            ).map(
              (f) => h(
                "button",
                {
                  type: "button",
                  key: f.path,
                  onClick: () => choose(f.path, f.directory),
                  disabled: busy
                },
                (f.directory ? "\u25B8 " : "") + f.name
              )
            )
          ),
          browser.truncated && h(
            "small",
            null,
            "First 1,000 entries shown. Open a subfolder using its path."
          )
        );
      }
      function modelList() {
        return h(
          import_react2.default.Fragment,
          null,
          !data?.profiles.length && h(
            "p",
            null,
            "No Dory profiles yet. Import your model files or a saved config."
          ),
          data?.profiles.map(
            (p) => h(
              "div",
              { className: "dsh-dory-row", key: p.id },
              h("strong", null, p.name),
              h(
                "p",
                null,
                `${p.loops} loop${p.loops === 1 ? "" : "s"} \xB7 ${p.context.toLocaleString()} context \xB7 ${p.kvK}/${p.kvV} KV \xB7 ${p.status}`
              ),
              h(
                "div",
                { className: "dsh-dory-actions" },
                button(
                  "Settings",
                  () => {
                    setDraft(structuredClone(p));
                    setBrowser(null);
                  },
                  busy || !!draft
                ),
                button(
                  p.status === "running" ? "Unload" : "Load",
                  () => perform(p.status === "running" ? "stop" : "start", {
                    id: p.id
                  }),
                  working || !!p.activeRequests || !p.enabled
                ),
                h(
                  "details",
                  null,
                  h("summary", null, "More"),
                  h(
                    "div",
                    { className: "dsh-dory-actions" },
                    button(
                      "Duplicate",
                      async () => {
                        const copy = await perform("duplicate", {
                          id: p.id
                        });
                        if (copy) setDraft(copy);
                      },
                      working
                    ),
                    button(
                      "Export config",
                      () => perform("exportConfig", { id: p.id }),
                      working
                    ),
                    button(
                      "Benchmark settings",
                      () => perform("benchmark", { id: p.id }),
                      working
                    ),
                    button(
                      "Remove profile",
                      () => {
                        if (window.confirm(
                          "Remove this Dory profile? Model files are kept."
                        ))
                          perform("remove", { id: p.id });
                      },
                      working
                    )
                  )
                )
              ),
              p.tuneReport && h(
                "details",
                null,
                h("summary", null, "Last measurement"),
                rates(p.tuneReport),
                h(
                  "small",
                  null,
                  p.tuneReport.measuredAt + " \xB7 Short prompt; long-context performance not qualified."
                )
              ),
              p.cacheStatus && h(
                "small",
                null,
                "Checkpoint " + p.cacheStatus.phase + (p.cacheStatus.message ? ": " + p.cacheStatus.message : "")
              )
            )
          )
        );
      }
      function filesView() {
        const models = scan?.models || [];
        const table = (title, items) => h(
          import_react2.default.Fragment,
          null,
          h("h4", null, title + " (" + items.length + ")"),
          items.map(
            (model) => h(
              "div",
              { className: "dsh-dory-row", key: model.path },
              h("strong", null, model.name),
              h(
                "p",
                null,
                model.complete ? "All " + model.files.length + " shard(s) present" : "Missing shards: " + model.missing.join(", ")
              ),
              model.complete && button(
                "Add model",
                () => perform("importModel", { path: model.path }),
                working
              ),
              h(
                "details",
                null,
                h("summary", null, "Files and components"),
                h(
                  "p",
                  null,
                  "Dory looped decoder. MTP/DFlash and vision projectors are not used by this engine."
                ),
                h(
                  "table",
                  null,
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "File"),
                      h("th", null, "Shard"),
                      h("th", null, "Role")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    model.files.map(
                      (file) => h(
                        "tr",
                        { key: file.path },
                        h("td", null, file.name),
                        h("td", null, file.index + " / " + file.count),
                        h("td", null, "Decoder weights")
                      )
                    )
                  )
                )
              )
            )
          )
        );
        return h(
          import_react2.default.Fragment,
          null,
          h(
            "p",
            null,
            scan ? "Scanned " + scan.root : "Scan a folder to find Dory models and their GGUF shards."
          ),
          button("Choose model folder", () => openBrowser("import"), busy),
          scan && table(
            "Complete models",
            models.filter((m) => m.complete)
          ),
          scan && table(
            "Missing shards",
            models.filter((m) => !m.complete)
          ),
          !!scan?.warnings.length && h(
            "details",
            null,
            h(
              "summary",
              null,
              "Skipped files (" + scan.warnings.length + ")"
            ),
            h("pre", null, scan.warnings.join("\n"))
          )
        );
      }
      function activityView() {
        return h(
          import_react2.default.Fragment,
          null,
          !jobs.length && h("p", null, "No recent activity."),
          jobs.slice().reverse().map(
            (job) => h(
              "div",
              { key: job.id, className: "dsh-dory-row" },
              h("strong", null, job.kind + " \xB7 " + job.status),
              h("p", { role: "status" }, job.progress),
              job.kind === "Benchmark settings" && rates(job.metrics),
              ["running", "queued"].includes(job.status) && button("Cancel", () => perform("cancel", { id: job.id })),
              job.kind === "Install Dory runtime" && job.status === "failed" && button(
                "Retry runtime installation",
                () => perform("installEngine"),
                working
              ),
              h(
                "details",
                null,
                h("summary", null, "Details"),
                h("pre", null, job.log || job.error || "Queued")
              )
            )
          ),
          data?.profiles.filter((p) => p.log).map(
            (p) => h(
              "details",
              { key: p.id },
              h("summary", null, p.name + " engine log"),
              h("pre", null, p.log)
            )
          )
        );
      }
      function editor() {
        if (!draft) return null;
        const native = draft.nativeContext || 262144;
        const contexts = Array.from(
          { length: Math.floor(Math.min(native, 262144) / 32768) },
          (_, i) => (i + 1) * 32768
        );
        if (!contexts.includes(draft.context)) contexts.push(draft.context);
        return h(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              save();
            }
          },
          h("h4", null, "Model settings"),
          field("name", "Model name"),
          h(
            "div",
            { className: "dsh-dory-grid" },
            select("loops", "Number of loops", [
              [1, "1 loop"],
              [2, "2 loops \xB7 recommended"],
              [3, "3 loops"],
              [4, "4 loops"]
            ]),
            select(
              "context",
              "Context",
              contexts.sort((a, b) => a - b).map((n) => [
                n,
                n === native ? "Native (" + n.toLocaleString() + " tokens)" : n / 1024 + "K tokens"
              ])
            ),
            select("kvK", "K cache precision", [
              ["f16", "FP16"],
              ["q8_0", "Q8"],
              ["q4_0", "Q4"]
            ]),
            select("kvV", "V cache precision", [
              ["f16", "FP16"],
              ["q8_0", "Q8"],
              ["q4_0", "Q4"]
            ]),
            select("kvMode", "Recurrent KV mode", [
              ["per_loop", "Per loop \xB7 reference behavior"],
              ["last_loop", "Last loop \xB7 smaller cache"]
            ])
          ),
          !draft.executable && draft.kvK !== draft.kvV && h(
            "small",
            null,
            "Mixed K/V formats use a slower FP16 attention fallback in the included runtime."
          ),
          h(
            "p",
            null,
            "Loops control recurrent computation. Dory does not use an MTP file, DFlash model, or vision projector in this engine."
          ),
          check(
            "autoFit",
            "Let the native engine fit GPU placement to available memory"
          ),
          h(
            "small",
            null,
            "Native fitting preserves your context and KV precision. Benchmarking measures speed; it does not search sampling settings."
          ),
          h(
            "details",
            null,
            h("summary", null, "Advanced"),
            field("modelPath", "Model GGUF path"),
            button("Browse model", () => openBrowser("modelPath"), busy),
            field("executable", "Custom Dory server (optional)"),
            button("Browse engine", () => openBrowser("executable"), busy),
            h(
              "p",
              null,
              "Leave the custom server empty to use the runtime installed from this repository."
            ),
            h(
              "div",
              { className: "dsh-dory-grid" },
              field("gpu", "GPU index", "number"),
              field("port", "Local port", "number"),
              !draft.autoFit && field("gpuLayers", "GPU layers", "number"),
              field("maxTokens", "Maximum output tokens", "number"),
              field("threads", "CPU threads", "number"),
              field("batchThreads", "Prefill CPU threads", "number"),
              field("batch", "Prefill batch", "number"),
              field("ubatch", "Physical microbatch", "number")
            ),
            check("enabled", "Enabled"),
            check(
              "kvCache",
              "Save conversation checkpoints to SSD \xB7 16 GiB per model \xB7 least recently used removed first"
            ),
            h(JsonField, {
              label: "Sampling settings (JSON)",
              value: draft.sampling,
              onChange: (value) => edit("sampling", value),
              disabled: busy
            }),
            h(JsonField, {
              label: "Additional named CLI options (JSON)",
              value: draft.options,
              onChange: (value) => edit("options", value),
              disabled: busy
            }),
            h(JsonField, {
              label: "Environment variables (JSON)",
              value: draft.environment,
              onChange: (value) => edit("environment", value),
              disabled: busy
            })
          ),
          browserView(),
          h(
            "div",
            { className: "dsh-dory-actions", style: { marginTop: 16 } },
            h(
              "button",
              { type: "submit", disabled: working },
              "Save profile"
            ),
            button("Save and benchmark", () => save(true), working),
            button(
              "Cancel",
              () => {
                setDraft(null);
                setBrowser(null);
              },
              busy
            )
          )
        );
      }
      return h(
        "section",
        {
          className: "dsh-dory-card dsh-engine-panel",
          "aria-label": "Dory inference engine"
        },
        h("style", null, css),
        h(
          EngineHeader,
          { name: "Dory", status: data?.sharedScheduler ? "Shared GPU scheduler" : "Independent GPU queue" },
          button(
            "Purge all cache",
            async () => {
              if (window.confirm(
                "Purge all Dory conversation checkpoints? Model files and settings are kept."
              )) {
                if (await perform("purgeCache"))
                  setNotice("All Dory checkpoints purged.");
              }
            },
            working
          )
        ),
        h(
          "small",
          null,
          data?.runtimeReady ? "Included runtime ready" : "Automatic runtime from GitHub \xB7 optional custom engine"
        ),
        error && h("p", { role: "alert", className: "dsh-dory-error" }, error),
        notice && h("p", { role: "status" }, notice),
        !data && h("p", null, "Connecting to Dory\u2026"),
        draft ? editor() : h(
          import_react2.default.Fragment,
          null,
          h(
            "nav",
            {
              className: "dsh-dory-actions",
              "aria-label": "Dory sections",
              style: { margin: "16px 0" }
            },
            ...["Models", "Files", "Download", "Activity"].map(
              (name) => h(
                "button",
                {
                  type: "button",
                  key: name,
                  "aria-pressed": tab === name,
                  onClick: () => setTab(name)
                },
                name
              )
            )
          ),
          h(
            "div",
            { className: "dsh-dory-actions" },
            button(
              "Import files",
              () => openBrowser("import"),
              working
            ),
            button(
              "Import config",
              () => openBrowser("config"),
              working
            ),
            button(
              "Add model",
              async () => {
                const p = await perform("new");
                if (p) setDraft(p);
              },
              working
            )
          ),
          browserView(),
          tab === "Models" ? modelList() : tab === "Files" ? filesView() : tab === "Activity" ? activityView() : h(RecommendedModels, {
            request,
            onUse: async (model, job) => {
              const p = await request("new");
              setDraft({
                ...p,
                ...model.settings,
                name: model.name,
                modelPath: job?.paths.find((f) => f.role === "modelPath")?.path || ""
              });
            }
          }),
          latest && tab !== "Activity" && h(
            "div",
            { className: "dsh-dory-row", role: "status" },
            h("strong", null, latest.kind + " \xB7 " + latest.status),
            h("p", null, latest.progress),
            latest.kind === "Benchmark settings" && rates(latest.metrics),
            button("View activity", () => setTab("Activity"))
          )
        ),
        h(
          "footer",
          { style: { marginTop: 16 } },
          h(
            "small",
            null,
            "16 GiB SSD checkpoints per model \xB7 survives restarts \xB7 oldest last-used removed first"
          )
        )
      );
    }
    function JsonField({ label, value, onChange, disabled }) {
      const [text, setText] = useState(JSON.stringify(value, null, 2)), [error, setError] = useState("");
      useEffect(() => setText(JSON.stringify(value, null, 2)), [value]);
      return h(
        "label",
        { className: "dsh-dory-field", style: { margin: "12px 0" } },
        label,
        h("textarea", {
          "aria-label": label,
          value: text,
          disabled,
          onChange: (e) => {
            setText(e.target.value);
            try {
              onChange(JSON.parse(e.target.value));
              e.target.setCustomValidity("");
              setError("");
            } catch {
              e.target.setCustomValidity("Fix invalid JSON before saving.");
              setError("Fix invalid JSON before saving.");
            }
          }
        }),
        error && h("span", { role: "alert" }, error)
      );
    }
    ctx.slots.inject(
      "settings.models.footer",
      () => ctx.slots.register(
        { name: "settings.models.footer", id: "dsh-dory", order: 30 },
        Card
      )
    );
  }
};
var { inject, apply } = plugin;

return module.exports;
}});
