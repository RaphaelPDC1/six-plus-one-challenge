import { afterEach, describe, expect, it, vi } from "vitest";
import { haptic, haptics } from "./haptics";

describe("haptics helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when vibration is unavailable", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {});

    expect(haptic("tap")).toBe(false);
  });

  it("vibrates the named success and submit patterns when supported", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { vibrate });

    expect(haptics.success()).toBe(true);
    expect(haptics.submit()).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, [18, 36, 18]);
    expect(vibrate).toHaveBeenNthCalledWith(2, [18, 28, 45]);
  });

  it("passes custom numeric patterns through safely", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { vibrate });

    expect(haptic([5, 10, 5])).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([5, 10, 5]);
  });
});
