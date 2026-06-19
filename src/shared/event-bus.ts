import type { GameEvent } from "./types";

export type EventHandler = (event: GameEvent) => void;

export interface EventBus {
  subscribe: (handler: EventHandler) => () => void;
  emit: (event: GameEvent) => void;
}

export function createEventBus(): EventBus {
  const handlers = new Set<EventHandler>();
  return {
    subscribe(handler: EventHandler): () => void {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    emit(event: GameEvent): void {
      handlers.forEach((h) => h(event));
    },
  };
}
