// ─── MCP Office API Server ───
// Phase 3: Lightweight local bridge between the 3D frontend and MCP services.

import Fastify from "fastify";
import cors from "@fastify/cors";
import { clientsRoutes } from "./routes/clients.js";
import { mcpActionsRoutes } from "./routes/mcpActions.js";

const PORT = 3001;
const HOST = "127.0.0.1";

async function bootstrap() {
  const app = Fastify({
    logger: true,
  });

  // ── CORS ──
  await app.register(cors, {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    methods: ["GET", "POST", "OPTIONS"],
  });

  // ── Routes ──
  await app.register(clientsRoutes);
  await app.register(mcpActionsRoutes);

  // ── Health check ──
  app.get("/api/health", async () => ({
    status: "ok",
    service: "mcp-office-server",
    timestamp: new Date().toISOString(),
  }));

  // ── Start ──
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 MCP Office API running at http://${HOST}:${PORT}\n`);
    console.log("  Routes:");
    console.log("    GET  /api/health");
    console.log("    GET  /api/clients");
    console.log("    GET  /api/clients/:slug");
    console.log("    POST /api/mcp/:npcId/actions/:actionId");
    console.log("");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
