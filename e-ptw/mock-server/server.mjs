/**
 * Локальный мок API для k6. Без зависимостей (только Node).
 * Не для прод — только прогон сценария нагрузки.
 */
import http from "http";
import { randomInt } from "crypto";

const PORT = Number(process.env.PORT) || 9099;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader("X-Service", "e-ptw-mock");

  if (req.method === "GET" && u.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/v1/permits") {
    // имитация списка с пагинацией
    await sleep(randomInt(3, 25));
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        items: [{ id: "m1", status: "on_review" }],
        nextPageToken: null,
      })
    );
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/v1/permits") {
    let body = "";
    for await (const c of req) body += c;
    await sleep(randomInt(5, 40));
    res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({ id: `p_${Date.now()}`, status: "draft", received: body.length })
    );
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/v1/permits/m1/approve") {
    await sleep(randomInt(5, 35));
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, status: "open" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[e-ptw-mock] http://127.0.0.1:${PORT}  (GET /health, /api/v1/permits, …)`);
});
