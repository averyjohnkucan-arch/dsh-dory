import z from "@deepseek-ai/schemastery";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Runtime } from "./lib/runtime.js";
import { DoryAdapter } from "./lib/adapter.js";
export const inject = ["llm", "webServer"];
export const Config = z.object({
  dataDir: z
    .string()
    .description("Dory-owned profiles and runtime state.")
    .default(""),
});
export async function apply(ctx, config) {
  const token = randomBytes(32).toString("hex");
  let registration;
  const runtime = new Runtime(config, () => registration?.replace(["dory"]));
  await runtime.init();
  // Installation is background work: the settings card remains usable on failure and offers Retry.
  if (process.platform === "linux" && process.arch === "x64")
    await runtime.action("installEngine");
  ctx.effect(() => {
    registration = ctx.llm.registerAdapter(
      ["dory"],
      new DoryAdapter(ctx, runtime),
    );
    return () => {
      registration?.();
      registration = undefined;
    };
  });
  ctx.inject(["modelScheduler"], (scope) =>
    scope.effect(() => {
      const scheduler = scope.get("modelScheduler");
      runtime.scheduler = scheduler;
      runtime.onChange();
      const unregister = scheduler.registerProvider("dory", () =>
        runtime.profiles.filter((p) => p.enabled).map((p) => runtime.driver(p)),
      );
      return async () => {
        unregister();
        for (const p of runtime.profiles)
          await scheduler.unload("dory:" + p.id, { force: true });
        runtime.scheduler = null;
        runtime.onChange();
      };
    }),
  );
  ctx.on("webserver/index-inject", (table) =>
    table.push({
      kind: "global",
      name: "__DSH_DORY__",
      value: { path: "/plugins/dsh-dory/action", token },
    }),
  );
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "exact",
      path: "/plugins/dsh-dory/action",
      handler: async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        const a = Buffer.from(
            (req.headers.authorization || "").replace(/^Bearer /, ""),
          ),
          b = Buffer.from(token);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          res.writeHead(401);
          res.end(JSON.stringify({ error: "Owner capability required." }));
          return;
        }
        if (
          req.method !== "POST" ||
          !String(req.headers["content-type"]).startsWith("application/json")
        ) {
          res.writeHead(405);
          res.end(JSON.stringify({ error: "POST JSON required." }));
          return;
        }
        if (
          req.headers.origin &&
          req.headers.origin !== ctx.webServer.getOrigin()
        ) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Origin refused." }));
          return;
        }
        try {
          let body = "",
            size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 2097152) throw Error("Request exceeds2MiB.");
            body += chunk;
          }
          const { action, payload } = JSON.parse(body);
          res.end(
            JSON.stringify({ result: await runtime.action(action, payload) }),
          );
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      },
    }),
  );
  ctx.effect(() => () => runtime.dispose());
}
