export type HapticPattern = "tap" | "success" | "warning" | "drawer" | "submit";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 12,
  success: [18, 36, 18],
  warning: [110, 40, 110],
  drawer: [8, 24, 8],
  submit: [35, 50, 35, 80, 65],
};

export function haptic(pattern: HapticPattern | number | number[] = "tap") {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") return false;
  const resolved = typeof pattern === "string" ? HAPTIC_PATTERNS[pattern] : pattern;
  navigator.vibrate(resolved);
  return true;
}

export const haptics = {
  tap: () => haptic("tap"),
  success: () => haptic("success"),
  warning: () => haptic("warning"),
  drawer: () => haptic("drawer"),
  submit: () => haptic("submit"),
};
