export type HapticPattern = "tap" | "success" | "warning" | "drawer" | "submit";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: [16],
  success: [20, 34, 26],
  warning: [95, 35, 95],
  drawer: [10, 22, 10],
  submit: [28, 42, 28, 64, 72],
};

const VISUAL_HAPTIC_CLASS = "haptic-visual-feedback";
let visualHapticTimer: number | null = null;

function runVisualHapticFallback(pattern: HapticPattern | number | number[], vibrated: boolean) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.dispatchEvent(new CustomEvent("sixplusone:haptic", { detail: { pattern, vibrated } }));
  document.documentElement.classList.remove(VISUAL_HAPTIC_CLASS);
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add(VISUAL_HAPTIC_CLASS);

  if (visualHapticTimer) window.clearTimeout(visualHapticTimer);
  visualHapticTimer = window.setTimeout(() => {
    document.documentElement.classList.remove(VISUAL_HAPTIC_CLASS);
    visualHapticTimer = null;
  }, 180);
}

export function haptic(pattern: HapticPattern | number | number[] = "tap") {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const resolved = typeof pattern === "string" ? HAPTIC_PATTERNS[pattern] : pattern;
  let vibrated = false;

  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      vibrated = navigator.vibrate(resolved);
    } catch {
      vibrated = false;
    }
  }

  runVisualHapticFallback(pattern, vibrated);
  return vibrated;
}

export const haptics = {
  tap: () => haptic("tap"),
  success: () => haptic("success"),
  warning: () => haptic("warning"),
  drawer: () => haptic("drawer"),
  submit: () => haptic("submit"),
};
