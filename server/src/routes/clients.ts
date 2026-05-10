// ─── Clients Route ───
// GET /api/clients          → list all client profiles (from real filesystem)
// GET /api/clients/:slug    → single client profile

import type { FastifyInstance } from "fastify";
import {
  discoverClients,
  discoverClientBySlug,
} from "../services/clientDiscovery.js";

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/api/clients", async () => {
    return discoverClients();
  });

  app.get<{ Params: { slug: string } }>(
    "/api/clients/:slug",
    async (request, reply) => {
      const client = await discoverClientBySlug(request.params.slug);
      if (!client) {
        return reply.status(404).send({ error: "Client not found" });
      }
      return client;
    }
  );
}
