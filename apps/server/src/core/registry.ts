import type { FastifyInstance } from 'fastify';
import { eventBus } from './eventBus';

/**
 * A "module" is a self-contained tool that plugs into the engine.
 *
 * This is the heart of Camelot's swiss-army-knife design. Today the only module
 * is the activity simulation. Tomorrow the real video maker, audio maker, and
 * web scraper will each be a module that registers here — without changing the
 * core.
 *
 * A module can do two things when it starts:
 *   - announce activity via the shared `eventBus`
 *   - (optionally) add its own web routes via the Fastify instance
 *
 * See docs/ADDING_A_MODULE.md for the step-by-step guide.
 */
export interface CamelotModule {
  /** A short identifier, e.g. "simulation", "video". */
  id: string;
  /** A friendly one-line description shown in logs. */
  description: string;
  /**
   * Called once when the engine boots. Receive shared services so the module
   * can broadcast events and (optionally) register routes.
   */
  start(context: ModuleContext): Promise<void> | void;
  /** Called when the engine shuts down, so the module can tidy up. */
  stop?(): Promise<void> | void;
}

/** The shared services handed to every module when it starts. */
export interface ModuleContext {
  app: FastifyInstance;
  bus: typeof eventBus;
}

/**
 * Keeps the list of registered modules and starts/stops them together.
 */
export class ModuleRegistry {
  private readonly modules: CamelotModule[] = [];

  /** Add a module before the engine boots. */
  register(module: CamelotModule): void {
    this.modules.push(module);
  }

  /** Start every registered module. */
  async startAll(app: FastifyInstance): Promise<void> {
    const context: ModuleContext = { app, bus: eventBus };
    for (const module of this.modules) {
      app.log.info(`[module] starting "${module.id}" — ${module.description}`);
      await module.start(context);
    }
  }

  /** Stop every registered module (reverse order). */
  async stopAll(): Promise<void> {
    for (const module of [...this.modules].reverse()) {
      await module.stop?.();
    }
  }
}

/** A single shared registry for the whole engine. */
export const registry = new ModuleRegistry();
