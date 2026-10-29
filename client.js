window.__ModuleLoader__.load({
  id: "dsh-dory",
  factory(require) {
    const React = require("react"),
      h = React.createElement;
    const { useState, useEffect, useRef } = React;
    return {
      inject: ["slots"],
      apply(ctx) {
        function RecommendedModels({ request, onUse }) {
          const [catalog, setCatalog] = React.useState(null),
            [error, setError] = React.useState(""),
            [busy, setBusy] = React.useState(false);
          React.useEffect(() => {
            let live = true;
            const refresh = () =>
              request("recommended")
                .then((value) => {
                  if (live) {
                    setCatalog(value);
                    setError("");
                  }
                })
                .catch((e) => {
                  if (live) setError(e.message);
                });
            refresh();
            const timer = setInterval(refresh, 2000);
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
                borderRadius: 8,
              },
            },
            h(
              "summary",
              null,
              "Recommended models · exact revisions and hashes",
            ),
            h(
              "p",
              null,
              "Download the official GGUF or select your existing BF16 conversion. Files are verified before use. Downloads do not load a model.",
            ),
            error && h("p", { role: "alert" }, error),
            !catalog && h("p", null, "Loading recommendations…"),
            catalog?.models.map((model) => {
              const job = catalog.jobs
                  .filter((j) => j.modelId === model.id)
                  .at(-1),
                downloadable =
                  model.files.length > 0 &&
                  model.files.every((f) => f.downloadable);
              return h(
                "div",
                {
                  key: model.id,
                  style: { margin: "14px 0", overflowWrap: "anywhere" },
                },
                h("strong", null, "Recommended · " + model.name),
                h("p", null, model.notes),
                model.revision && h("code", null, model.revision),
                h(
                  "details",
                  null,
                  h("summary", null, "Files, sizes and exact identities"),
                  model.files.map((f, i) =>
                    h(
                      "div",
                      { key: i, style: { margin: "8px 0" } },
                      h(
                        "div",
                        null,
                        f.name +
                          (f.size
                            ? " · " + (f.size / 1073741824).toFixed(2) + " GiB"
                            : ""),
                      ),
                      f.repo && h("div", null, f.repo + " @ " + f.revision),
                      h(
                        "code",
                        null,
                        f.sha256
                          ? "SHA-256 " + f.sha256
                          : f.gitBlob
                            ? "Git blob " + f.gitBlob
                            : "Revision " +
                              (f.revision ||
                                "Local file; select through importer"),
                      ),
                      !f.downloadable &&
                        h(
                          "p",
                          null,
                          "Local conversion or assembled component; import the existing file.",
                        ),
                    ),
                  ),
                ),
                downloadable &&
                  h(
                    "button",
                    {
                      type: "button",
                      disabled:
                        busy ||
                        catalog.jobs.some((j) => j.status === "running"),
                      onClick: () =>
                        run("recommendedDownload", { id: model.id }),
                    },
                    "Download / verify recommended",
                  ),
                onUse &&
                  h(
                    "button",
                    {
                      type: "button",
                      disabled: busy || job?.status === "running",
                      onClick: () =>
                        Promise.resolve(
                          onUse(model, job?.status === "complete" ? job : null),
                        ).catch((e) => setError(e.message)),
                    },
                    job?.status === "complete"
                      ? "Add downloaded files"
                      : "Add existing model",
                  ),
                !downloadable &&
                  h(
                    "p",
                    null,
                    "This set needs existing local files or the setup command described above.",
                  ),
                job &&
                  h(
                    "div",
                    { role: "status" },
                    job.status +
                      " · " +
                      job.progress +
                      (job.total
                        ? " · " +
                          Math.min(
                            100,
                            Math.floor((job.received / job.total) * 100),
                          ) +
                          "%"
                        : ""),
                    job.directory &&
                      h("code", { style: { display: "block" } }, job.directory),
                    job.status === "running" &&
                      h(
                        "button",
                        {
                          type: "button",
                          onClick: () =>
                            run("recommendedCancel", { id: job.id }),
                        },
                        "Cancel download",
                      ),
                  ),
              );
            }),
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
        const button = (label, onClick, disabled = false) =>
          h("button", { type: "button", onClick, disabled }, label);
        const rates = (metrics) =>
          h(
            "div",
            { className: "dsh-dory-actions" },
            h(
              "strong",
              null,
              "Prefill ",
              Number.isFinite(metrics?.prefill)
                ? metrics.prefill.toFixed(1) + " tok/s"
                : "Measuring…",
            ),
            h(
              "strong",
              null,
              "Decode ",
              Number.isFinite(metrics?.decode)
                ? metrics.decode.toFixed(1) + " tok/s"
                : "Measuring…",
            ),
          );

        function Card() {
          const [data, setData] = useState(null),
            [draft, setDraft] = useState(null),
            [tab, setTab] = useState("Models");
          const [error, setError] = useState(""),
            [notice, setNotice] = useState(""),
            [busy, setBusy] = useState(false);
          const [browser, setBrowser] = useState(null),
            [config, setConfig] = useState(""),
            [scan, setScan] = useState(null);
          const [lastFolder, setLastFolder] = useState("");
          const downloads = useRef(new Set()),
            requestedExports = useRef(new Set());
          async function request(action, payload = {}) {
            const cap = window.__DSH_DORY__;
            if (!cap)
              throw Error(
                "Dory plugin connection is unavailable. Reload DSH after installing.",
              );
            const response = await fetch(cap.path, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + cap.token,
              },
              body: JSON.stringify({ action, payload }),
            });
            const body = await response.json();
            if (!response.ok || body.error)
              throw Error(body.error || "Dory request failed.");
            return body.result;
          }
          useEffect(() => {
            let live = true;
            const refresh = () =>
              request("list")
                .then((value) => {
                  if (live) setData(value);
                })
                .catch((e) => {
                  if (live) setError(e.message);
                });
            refresh();
            const timer = setInterval(refresh, 2000);
            return () => {
              live = false;
              clearInterval(timer);
            };
          }, []);
          useEffect(() => {
            for (const job of data?.jobs || []) {
              if (
                job.kind === "Scan model folders" &&
                job.status === "complete"
              )
                setScan(job.result);
              if (
                job.kind === "Export config" &&
                job.status === "complete" &&
                requestedExports.current.has(job.id) &&
                !downloads.current.has(job.id)
              ) {
                downloads.current.add(job.id);
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(job.result, null, 2) + "\n"], {
                    type: "application/json",
                  }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download =
                  job.result.name.replace(/[^a-zA-Z0-9._-]+/g, "-") +
                  ".dsh-model.json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          const working =
            busy ||
            data?.jobs?.some((j) => ["running", "queued"].includes(j.status));
          const jobs = data?.jobs || [],
            latest = jobs.at(-1);
          const edit = (key, value) =>
            setDraft((p) => ({
              ...p,
              [key]: value,
              ...(key === "context"
                ? { maxTokens: Math.min(p.maxTokens, value) }
                : {}),
            }));
          const field = (key, label, type = "text") =>
            h(
              "label",
              { className: "dsh-dory-field", key },
              label,
              h("input", {
                "aria-label": label,
                type,
                value: draft[key] ?? "",
                disabled: busy,
                onChange: (e) =>
                  edit(
                    key,
                    type === "number" ? Number(e.target.value) : e.target.value,
                  ),
              }),
            );
          const select = (key, label, values) =>
            h(
              "label",
              { className: "dsh-dory-field", key },
              label,
              h(
                "select",
                {
                  "aria-label": label,
                  value: draft[key],
                  disabled: busy,
                  onChange: (e) =>
                    edit(
                      key,
                      ["context", "loops"].includes(key)
                        ? Number(e.target.value)
                        : e.target.value,
                    ),
                },
                values.map(([value, label]) =>
                  h("option", { key: value, value }, label),
                ),
              ),
            );
          const check = (key, label) =>
            h(
              "label",
              { style: { display: "block", margin: "12px 0" } },
              h("input", {
                type: "checkbox",
                style: { width: "auto" },
                checked: draft[key],
                onChange: (e) => edit(key, e.target.checked),
              }),
              " " + label,
            );
          function browserView() {
            if (!browser) return null;
            const folder = ["import", "configRoot"].includes(browser.target);
            const title =
              browser.target === "config"
                ? "Select model config"
                : browser.target === "configRoot"
                  ? "Find the matching model files"
                  : browser.target === "executable"
                    ? "Select Dory server"
                    : "Select model files or scan a folder";
            return h(
              "div",
              { className: "dsh-dory-browser", "aria-label": title },
              h("strong", null, title),
              h(
                "p",
                null,
                folder
                  ? "Choose a folder. Subfolders are included; model files stay where they are."
                  : "Choose a file below.",
              ),
              h(
                "div",
                { className: "dsh-dory-actions" },
                h("input", {
                  "aria-label": "Folder path",
                  value: browser.input,
                  onChange: (e) =>
                    setBrowser((b) => ({ ...b, input: e.target.value })),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      openBrowser(browser.target, browser.input);
                    }
                  },
                }),
                button(
                  "Open folder",
                  () => openBrowser(browser.target, browser.input),
                  busy,
                ),
              ),
              h(
                "div",
                { className: "dsh-dory-actions", style: { marginTop: 8 } },
                button(
                  "↑ Parent folder",
                  () => openBrowser(browser.target, browser.parent),
                  busy,
                ),
                folder &&
                  button(
                    browser.target === "configRoot"
                      ? "Find and import config"
                      : "Scan this folder",
                    chooseDirectory,
                    busy,
                  ),
                button("Close browser", () => setBrowser(null)),
              ),
              h(
                "div",
                { className: "dsh-dory-browser-list" },
                browser.entries
                  .filter(
                    (f) =>
                      f.directory ||
                      (browser.target === "config"
                        ? /\.json$/i.test(f.name)
                        : browser.target === "executable"
                          ? /llama-server(?:\.exe)?$/.test(f.name)
                          : browser.target === "configRoot"
                            ? false
                            : /\.gguf$/i.test(f.name)),
                  )
                  .map((f) =>
                    h(
                      "button",
                      {
                        type: "button",
                        key: f.path,
                        onClick: () => choose(f.path, f.directory),
                        disabled: busy,
                      },
                      (f.directory ? "▸ " : "") + f.name,
                    ),
                  ),
              ),
              browser.truncated &&
                h(
                  "small",
                  null,
                  "First 1,000 entries shown. Open a subfolder using its path.",
                ),
            );
          }
          function modelList() {
            return h(
              React.Fragment,
              null,
              !data?.profiles.length &&
                h(
                  "p",
                  null,
                  "No Dory profiles yet. Import your model files or a saved config.",
                ),
              data?.profiles.map((p) =>
                h(
                  "div",
                  { className: "dsh-dory-row", key: p.id },
                  h("strong", null, p.name),
                  h(
                    "p",
                    null,
                    `${p.loops} loop${p.loops === 1 ? "" : "s"} · ${p.context.toLocaleString()} context · ${p.kvK}/${p.kvV} KV · ${p.status}`,
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
                      busy || !!draft,
                    ),
                    button(
                      p.status === "running" ? "Unload" : "Load",
                      () =>
                        perform(p.status === "running" ? "stop" : "start", {
                          id: p.id,
                        }),
                      working || !!p.activeRequests || !p.enabled,
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
                              id: p.id,
                            });
                            if (copy) setDraft(copy);
                          },
                          working,
                        ),
                        button(
                          "Export config",
                          () => perform("exportConfig", { id: p.id }),
                          working,
                        ),
                        button(
                          "Benchmark settings",
                          () => perform("benchmark", { id: p.id }),
                          working,
                        ),
                        button(
                          "Remove profile",
                          () => {
                            if (
                              window.confirm(
                                "Remove this Dory profile? Model files are kept.",
                              )
                            )
                              perform("remove", { id: p.id });
                          },
                          working,
                        ),
                      ),
                    ),
                  ),
                  p.tuneReport &&
                    h(
                      "details",
                      null,
                      h("summary", null, "Last measurement"),
                      rates(p.tuneReport),
                      h(
                        "small",
                        null,
                        p.tuneReport.measuredAt +
                          " · Short prompt; long-context performance not qualified.",
                      ),
                    ),
                  p.cacheStatus &&
                    h(
                      "small",
                      null,
                      "Checkpoint " +
                        p.cacheStatus.phase +
                        (p.cacheStatus.message
                          ? ": " + p.cacheStatus.message
                          : ""),
                    ),
                ),
              ),
            );
          }
          function filesView() {
            const models = scan?.models || [];
            const table = (title, items) =>
              h(
                React.Fragment,
                null,
                h("h4", null, title + " (" + items.length + ")"),
                items.map((model) =>
                  h(
                    "div",
                    { className: "dsh-dory-row", key: model.path },
                    h("strong", null, model.name),
                    h(
                      "p",
                      null,
                      model.complete
                        ? "All " + model.files.length + " shard(s) present"
                        : "Missing shards: " + model.missing.join(", "),
                    ),
                    model.complete &&
                      button(
                        "Add model",
                        () => perform("importModel", { path: model.path }),
                        working,
                      ),
                    h(
                      "details",
                      null,
                      h("summary", null, "Files and components"),
                      h(
                        "p",
                        null,
                        "Dory looped decoder. MTP/DFlash and vision projectors are not used by this engine.",
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
                            h("th", null, "Role"),
                          ),
                        ),
                        h(
                          "tbody",
                          null,
                          model.files.map((file) =>
                            h(
                              "tr",
                              { key: file.path },
                              h("td", null, file.name),
                              h("td", null, file.index + " / " + file.count),
                              h("td", null, "Decoder weights"),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            return h(
              React.Fragment,
              null,
              h(
                "p",
                null,
                scan
                  ? "Scanned " + scan.root
                  : "Scan a folder to find Dory models and their GGUF shards.",
              ),
              button("Choose model folder", () => openBrowser("import"), busy),
              scan &&
                table(
                  "Complete models",
                  models.filter((m) => m.complete),
                ),
              scan &&
                table(
                  "Missing shards",
                  models.filter((m) => !m.complete),
                ),
              !!scan?.warnings.length &&
                h(
                  "details",
                  null,
                  h(
                    "summary",
                    null,
                    "Skipped files (" + scan.warnings.length + ")",
                  ),
                  h("pre", null, scan.warnings.join("\n")),
                ),
            );
          }
          function activityView() {
            return h(
              React.Fragment,
              null,
              !jobs.length && h("p", null, "No recent activity."),
              jobs
                .slice()
                .reverse()
                .map((job) =>
                  h(
                    "div",
                    { key: job.id, className: "dsh-dory-row" },
                    h("strong", null, job.kind + " · " + job.status),
                    h("p", { role: "status" }, job.progress),
                    job.kind === "Benchmark settings" && rates(job.metrics),
                    ["running", "queued"].includes(job.status) &&
                      button("Cancel", () => perform("cancel", { id: job.id })),
                    job.kind === "Install Dory runtime" &&
                      job.status === "failed" &&
                      button(
                        "Retry runtime installation",
                        () => perform("installEngine"),
                        working,
                      ),
                    h(
                      "details",
                      null,
                      h("summary", null, "Details"),
                      h("pre", null, job.log || job.error || "Queued"),
                    ),
                  ),
                ),
              data?.profiles
                .filter((p) => p.log)
                .map((p) =>
                  h(
                    "details",
                    { key: p.id },
                    h("summary", null, p.name + " engine log"),
                    h("pre", null, p.log),
                  ),
                ),
            );
          }
          function editor() {
            if (!draft) return null;
            const native = draft.nativeContext || 262144;
            const contexts = Array.from(
              { length: Math.floor(Math.min(native, 262144) / 32768) },
              (_, i) => (i + 1) * 32768,
            );
            if (!contexts.includes(draft.context)) contexts.push(draft.context);
            return h(
              "form",
              {
                onSubmit: (e) => {
                  e.preventDefault();
                  save();
                },
              },
              h("h4", null, "Model settings"),
              field("name", "Model name"),
              h(
                "div",
                { className: "dsh-dory-grid" },
                select("loops", "Number of loops", [
                  [1, "1 loop"],
                  [2, "2 loops · recommended"],
                  [3, "3 loops"],
                  [4, "4 loops"],
                ]),
                select(
                  "context",
                  "Context",
                  contexts
                    .sort((a, b) => a - b)
                    .map((n) => [
                      n,
                      n === native
                        ? "Native (" + n.toLocaleString() + " tokens)"
                        : n / 1024 + "K tokens",
                    ]),
                ),
                select("kvK", "K cache precision", [
                  ["f16", "FP16"],
                  ["q8_0", "Q8"],
                  ["q4_0", "Q4"],
                ]),
                select("kvV", "V cache precision", [
                  ["f16", "FP16"],
                  ["q8_0", "Q8"],
                  ["q4_0", "Q4"],
                ]),
                select("kvMode", "Recurrent KV mode", [
                  ["per_loop", "Per loop · reference behavior"],
                  ["last_loop", "Last loop · smaller cache"],
                ]),
              ),
              !draft.executable &&
                draft.kvK !== draft.kvV &&
                h(
                  "small",
                  null,
                  "Mixed K/V formats use a slower FP16 attention fallback in the included runtime.",
                ),
              h(
                "p",
                null,
                "Loops control recurrent computation. Dory does not use an MTP file, DFlash model, or vision projector in this engine.",
              ),
              check(
                "autoFit",
                "Let the native engine fit GPU placement to available memory",
              ),
              h(
                "small",
                null,
                "Native fitting preserves your context and KV precision. Benchmarking measures speed; it does not search sampling settings.",
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
                  "Leave the custom server empty to use the runtime installed from this repository.",
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
                  field("ubatch", "Physical microbatch", "number"),
                ),
                check("enabled", "Enabled"),
                check(
                  "kvCache",
                  "Save conversation checkpoints to SSD · 16 GiB per model · least recently used removed first",
                ),
                h(JsonField, {
                  label: "Sampling settings (JSON)",
                  value: draft.sampling,
                  onChange: (value) => edit("sampling", value),
                  disabled: busy,
                }),
                h(JsonField, {
                  label: "Additional named CLI options (JSON)",
                  value: draft.options,
                  onChange: (value) => edit("options", value),
                  disabled: busy,
                }),
                h(JsonField, {
                  label: "Environment variables (JSON)",
                  value: draft.environment,
                  onChange: (value) => edit("environment", value),
                  disabled: busy,
                }),
              ),
              browserView(),
              h(
                "div",
                { className: "dsh-dory-actions", style: { marginTop: 16 } },
                h(
                  "button",
                  { type: "submit", disabled: working },
                  "Save profile",
                ),
                button("Save and benchmark", () => save(true), working),
                button(
                  "Cancel",
                  () => {
                    setDraft(null);
                    setBrowser(null);
                  },
                  busy,
                ),
              ),
            );
          }
          return h(
            "section",
            {
              className: "dsh-dory-card",
              "aria-label": "Dory inference engine",
            },
            h("style", null, css),
            h(
              "div",
              { className: "dsh-dory-header" },
              h("h3", null, "Dory ", h("small", null, data?.version || "")),
              h(
                "small",
                null,
                data?.sharedScheduler
                  ? "Shared GPU scheduler"
                  : "Independent GPU queue",
              ),
              button(
                "Purge all cache",
                async () => {
                  if (
                    window.confirm(
                      "Purge all Dory conversation checkpoints? Model files and settings are kept.",
                    )
                  ) {
                    if (await perform("purgeCache"))
                      setNotice("All Dory checkpoints purged.");
                  }
                },
                working,
              ),
            ),
            h(
              "small",
              null,
              data?.runtimeReady
                ? "Included runtime ready"
                : "Automatic runtime from GitHub · optional custom engine",
            ),
            error &&
              h("p", { role: "alert", className: "dsh-dory-error" }, error),
            notice && h("p", { role: "status" }, notice),
            !data && h("p", null, "Connecting to Dory…"),
            draft
              ? editor()
              : h(
                  React.Fragment,
                  null,
                  h(
                    "nav",
                    {
                      className: "dsh-dory-actions",
                      "aria-label": "Dory sections",
                      style: { margin: "16px 0" },
                    },
                    ...["Models", "Files", "Download", "Activity"].map((name) =>
                      h(
                        "button",
                        {
                          type: "button",
                          key: name,
                          "aria-pressed": tab === name,
                          onClick: () => setTab(name),
                        },
                        name,
                      ),
                    ),
                  ),
                  h(
                    "div",
                    { className: "dsh-dory-actions" },
                    button(
                      "Import files",
                      () => openBrowser("import"),
                      working,
                    ),
                    button(
                      "Import config",
                      () => openBrowser("config"),
                      working,
                    ),
                    button(
                      "Add model",
                      async () => {
                        const p = await perform("new");
                        if (p) setDraft(p);
                      },
                      working,
                    ),
                  ),
                  browserView(),
                  tab === "Models"
                    ? modelList()
                    : tab === "Files"
                      ? filesView()
                      : tab === "Activity"
                        ? activityView()
                        : h(RecommendedModels, {
                            request,
                            onUse: async (model, job) => {
                              const p = await request("new");
                              setDraft({
                                ...p,
                                ...model.settings,
                                name: model.name,
                                modelPath:
                                  job?.paths.find((f) => f.role === "modelPath")
                                    ?.path || "",
                              });
                            },
                          }),
                  latest &&
                    tab !== "Activity" &&
                    h(
                      "div",
                      { className: "dsh-dory-row", role: "status" },
                      h("strong", null, latest.kind + " · " + latest.status),
                      h("p", null, latest.progress),
                      latest.kind === "Benchmark settings" &&
                        rates(latest.metrics),
                      button("View activity", () => setTab("Activity")),
                    ),
                ),
            h(
              "footer",
              { style: { marginTop: 16 } },
              h(
                "small",
                null,
                "16 GiB SSD checkpoints per model · survives restarts · oldest last-used removed first",
              ),
            ),
          );
        }
        function JsonField({ label, value, onChange, disabled }) {
          const [text, setText] = useState(JSON.stringify(value, null, 2)),
            [error, setError] = useState("");
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
              },
            }),
            error && h("span", { role: "alert" }, error),
          );
        }
        ctx.slots.inject("settings.models.footer", () =>
          ctx.slots.register(
            { name: "settings.models.footer", id: "dsh-dory", order: 30 },
            Card,
          ),
        );
      },
    };
  },
});
