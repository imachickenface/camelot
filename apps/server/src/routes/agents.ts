import type { FastifyInstance } from 'fastify';
import type { AgentProfileUpdate } from '@camelot/shared';
import { eventBus } from '../core/eventBus';
import { getAgent, getAgents, updateAgentProfile } from '../storage/jsonStore';

/**
 * Routes for reading and editing the knights of the Round Table.
 *
 *   GET  /api/agents       → the full list of 12 seats
 *   GET  /api/agents/:id   → one seat
 *   PUT  /api/agents/:id   → save a profile edit (from the Settings screen)
 */
export async function registerAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/agents', async () => {
    return { agents: getAgents() };
  });

  app.get<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    const agent = getAgent(req.params.id);
    if (!agent) {
      return reply.code(404).send({ error: 'No such agent.' });
    }
    return { agent };
  });

  app.put<{ Params: { id: string }; Body: AgentProfileUpdate }>(
    '/api/agents/:id',
    async (req, reply) => {
      const updated = await updateAgentProfile(req.params.id, req.body ?? {});
      if (!updated) {
        return reply.code(404).send({ error: 'No such agent.' });
      }
      // Tell every open browser the seat changed, so the table updates live.
      eventBus.publish({ type: 'agent.updated', agent: updated });
      return { agent: updated };
    },
  );
}
