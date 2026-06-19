import { describe, it, expect, vi } from "vitest";
import { createEventBus } from "./event-bus";

describe("EventBus", () => {
  it("subscribes and emits events", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.subscribe(handler);
    bus.emit({ type: "TILE_CHANGED", x: 5, y: 10 });
    expect(handler).toHaveBeenCalledWith({ type: "TILE_CHANGED", x: 5, y: 10 });
  });

  it("unsubscribes and stops receiving events", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(handler);
    unsubscribe();
    bus.emit({ type: "TILE_CHANGED", x: 0, y: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple subscribers", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.emit({ type: "ECONOMY_TICK", money: 100, income: 50, expenses: 30 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
