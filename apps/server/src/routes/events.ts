import type { FastifyInstance } from 'fastify';
import { eventBus } from '../core/eventBus';

/**
 * The live activity feed, delivered over Server-Sent Events (SSE).
 *
 * SSE is a simple, one-way stream: the browser opens `GET /api/events` once and
 * the engine keeps pushing updates down it. No polling, no manual refresh. We
 * use it (rather than websockets) because all the traffic flows one way —
 * engine → browser — which is exactly what SSE is built for.
 */
export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/events', (req, reply) => {
    // Tell Fastify we'll manage this raw response ourselves (it's a long-lived
    // stream, not a normal one-shot reply).
    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Disable proxy buffering so events arrive immediately (nginx in Docker).
      'X-Accel-Buffering': 'no',
    });
    // Open comment line so the connection is established right away.
    reply.raw.write(': connected\n\n');

    const send = (event: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = eventBus.subscribe(send);

    // A heartbeat keeps the connection alive through idle periods.
    const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
