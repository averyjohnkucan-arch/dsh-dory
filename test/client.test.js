import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import { readFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gguf } from "./model-fixture.js";
import { Runtime } from "../lib/runtime.js";
const dev = createRequire(process.env.DSH_DORY_UI_DEPS || import.meta.url);
const React = dev("react"),
  { JSDOM } = dev("jsdom");
test("settings card adds and duplicates same-weight profiles with independent loop choices", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "dory-ui-"));
  const modelFolder = join(dir, "models");
  await mkdir(modelFolder);
  await gguf(join(modelFolder, "Dory.gguf"));
  const runtime = new Runtime({ dataDir: dir });
  await runtime.init();
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "http://localhost:8297",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    fetch: globalThis.fetch,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const inflight = new Set();
  globalThis.fetch = async (path, options) => {
    assert.equal(options.headers.Authorization, "Bearer fixture");
    const { action, payload } = JSON.parse(options.body);
    const job = runtime.action(
      action,
      action === "browse" && !payload.path
        ? { ...payload, path: modelFolder }
        : payload,
    );
    inflight.add(job);
    try {
      const result = await job;
      return { ok: true, json: async () => ({ result }) };
    } catch (e) {
      return { ok: false, json: async () => ({ error: e.message }) };
    } finally {
      inflight.delete(job);
    }
  };
  window.__DSH_DORY__ = { path: "/plugins/dsh-dory/action", token: "fixture" };
  window.confirm = () => true;
  let Card;
  window.__ModuleLoader__ = {
    load(spec) {
      assert.equal(spec.id, "dsh-dory");
      const plugin = spec.factory((id) => {
        assert.equal(id, "react");
        return React;
      });
      plugin.apply({
        slots: {
          inject(key, callback) {
            assert.equal(key, "settings.models.footer");
            callback();
          },
          register(spec, component) {
            assert.equal(spec.id, "dsh-dory");
            Card = component;
            return () => {};
          },
        },
      });
    },
  };
  vm.runInThisContext(
    await readFile(new URL("../client.js", import.meta.url), "utf8"),
    { filename: "dory-client.js" },
  );
  const { createRoot } = dev("react-dom/client");
  const root = createRoot(document.getElementById("root"));
  t.after(async () => {
    await React.act(() => root.unmount());
    await runtime.dispose();
    dom.window.close();
    for (const [k, v] of Object.entries(previous))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    await rm(dir, { recursive: true, force: true });
  });
  const tick = () => new Promise((r) => setImmediate(r));
  const click = async (text) => {
    const b = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === text,
    );
    assert.ok(b, text);
    await React.act(async () => {
      b.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      do {
        await Promise.allSettled([...inflight]);
        await tick();
      } while (inflight.size);
    });
  };
  const loops = async (value) =>
    React.act(async () => {
      const s = document.querySelector('select[aria-label="Number of loops"]');
      assert.deepEqual(
        [...s.options].map((o) => o.value),
        ["1", "2", "3", "4"],
      );
      s.value = String(value);
      s.dispatchEvent(new window.Event("change", { bubbles: true }));
      await tick();
    });
  const submit = async () =>
    React.act(async () => {
      document
        .querySelector("form")
        .dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
      await tick();
      await runtime.queue;
      await tick();
    });
  await React.act(async () => {
    root.render(React.createElement(Card));
    await tick();
  });
  assert.match(document.body.textContent, /No Dory profiles yet/);
  await click("Add model");
  await loops(1);
  await submit();
  assert.equal(runtime.profiles.length, 1);
  assert.equal(runtime.profiles[0].loops, 1);
  await click("Duplicate");
  await loops(4);
  await submit();
  assert.equal(runtime.profiles.length, 2);
  assert.equal(runtime.profiles[0].loops, 1);
  assert.equal(runtime.profiles[1].loops, 4);
  assert.equal(runtime.profiles[0].modelPath, runtime.profiles[1].modelPath);
  assert.notEqual(runtime.profiles[0].id, runtime.profiles[1].id);
  assert.match(document.body.textContent, /4 loops/);
  await click("Settings");
  assert.equal(
    document.querySelector('input[aria-label="Model name"]').value,
    runtime.profiles[0].name,
  );
  assert.match(document.body.textContent, /does not use an MTP file/);
  const context = document.querySelector('select[aria-label="Context"]');
  assert.deepEqual(
    [...context.options].map((o) => Number(o.value)),
    [32768, 65536, 98304, 131072, 163840, 196608, 229376, 262144],
  );
  await React.act(async () => {
    context.value = "65536";
    context.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
  });
  const precision = document.querySelector(
    'select[aria-label="K cache precision"]',
  );
  assert.deepEqual(
    [...precision.options].map((o) => o.value),
    ["f16", "q8_0", "q4_0"],
  );
  await React.act(async () => {
    precision.value = "q4_0";
    precision.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
  });
  const selected = runtime.profiles[0].id;
  await submit();
  assert.equal(runtime.find(selected).context, 65536);
  assert.equal(runtime.find(selected).kvK, "q4_0");
  await click("Import files");
  assert.match(
    document.body.textContent,
    /Select model files or scan a folder/,
  );
  await click("Scan this folder");
  await React.act(async () => {
    await Promise.all([...runtime.jobs.items.values()].map((j) => j.promise));
    await new Promise((r) => setTimeout(r, 2100));
  });
  assert.match(document.body.textContent, /Complete models \(1\)/);
  assert.match(document.body.textContent, /Missing shards \(0\)/);
  await React.act(async () => {
    const buttons = [...document.querySelectorAll("button")].filter(
      (b) => b.textContent === "Add model",
    );
    buttons.at(-1).click();
    await tick();
  });
  await React.act(async () => {
    await Promise.all([...runtime.jobs.items.values()].map((j) => j.promise));
    await new Promise((r) => setTimeout(r, 2100));
  });
  assert.ok(
    runtime.profiles.some(
      (p) => p.modelPath === join(modelFolder, "Dory.gguf"),
    ),
  );
  assert.ok(document.querySelector("button")?.textContent);
});
