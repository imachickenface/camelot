import { EventEmitter } from 'node:events';
import type { ServerEvent } from '@camelot/shared';

/**
 * The event bus is the engine's public address system.
 *
 * Anything that happens worth knowing about — an agent changed status, a new
 * activity line — is `publish`ed here. The live-feed route (SSE) subscribes and
 * forwards each event to every connected browser.
 *
 * This is deliberately tiny and generic so future tools can announce their own
 * activity without touching anything else.
 */
class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many browsers may be listening at once; lift the default cap.
    this.emitter.setMaxListeners(100);
  }

  /** Announce something to every subscriber. */
  publish(event: ServerEvent): void {
    this.emitter.emit('event', event);
  }

  /**
   * Listen for events. Returns an `unsubscribe` function — call it when the
   * listener (e.g. a closed browser connection) goes away.
   */
  subscribe(listener: (event: ServerEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }
}

/** A single shared bus for the whole engine. */
export const eventBus = new EventBus();
