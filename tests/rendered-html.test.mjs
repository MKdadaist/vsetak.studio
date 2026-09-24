import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the vsetak.studio landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ru"/i);
  assert.match(html, /<title>Всё так — контент, дизайн, концепции<\/title>/i);
  assert.match(html, /Привет, я(?:\u00a0|&nbsp;)Марк Калинин/);
  assert.doesNotMatch(html, /Марк Калинин\./);
  assert.match(html, /Кейсы откроются чуть позже/);
  assert.doesNotMatch(html, /Что делаем/);
  assert.match(html, /моя моностудия контента/);
  assert.doesNotMatch(html, /Создаём|Проектируем|Работаем|Собираем/);
  assert.match(html, /mailto:hello@vsetak\.studio/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/i);
});

test("keeps the portfolio on /work", async () => {
  const response = await render("/work");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Что делаем/);
  assert.match(html, /Презентации/);
});
