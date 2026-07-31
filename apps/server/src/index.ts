import cors from '@fastify/cors';
import Fastify from 'fastify';
import { registry } from './core/registry';
import { createSimulationModule } from './modules/simulation';
import { registerAgentRoutes } from './routes/agents';
import { registerEventRoutes } from './routes/events';
import { loadAgents } from './storage/jsonStore';

/**
 * The Camelot engine — start-up sequence.
 *
 *   1. Load the saved knights (or seed them on first run).
 *   2. Register routes the website talks to.
 *   3. Register and start the tools ("modules"). Today: just the simulation.
 *   4. Listen for requests.
 *
 * To add a real tool later, build it as a module and `registry.register(...)`
 * it below — nothing else here needs to change. See docs/ADDING_A_MODULE.md.
 */

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  // The website (a different address in development) is allowed to call us.
  await app.register(cors, { origin: true });

  await loadAgents();

  await registerAgentRoutes(app);
  await registerEventRoutes(app);

  app.get('/api/health', async () => ({ status: 'ok', realm: 'Camelot' }));

  // --- Tools (modules) -----------------------------------------------------
  registry.register(createSimulationModule());
  await registry.startAll(app);

  // Tidy up the tools on shutdown.
  const shutdown = async () => {
    await registry.stopAll();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Camelot engine listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error('Camelot engine failed to start:', err);
  process.exit(1);
});
