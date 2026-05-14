import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("PWA and mobile layout refinements", () => {
  it("uses the game name and orange 6+1 PNG app icons for saved home-screen shortcuts", () => {
    const html = readProjectFile("client/index.html");
    const manifest = JSON.parse(readProjectFile("client/public/site.webmanifest"));
    const iconScript = readProjectFile("scripts_make_pwa_icons.py");
    const svgFallback = readProjectFile("client/public/app-icon.svg");

    expect(html).toContain("<title>6+1 Four Lives Challenge</title>");
    expect(html).toContain('name="apple-mobile-web-app-title" content="6+1 Four Lives Challenge"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/app-icon-180.png"');
    expect(manifest.name).toBe("6+1 Four Lives Challenge");
    expect(manifest.short_name).toBe("6+1 Challenge");
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual(["/app-icon-192.png", "/app-icon-512.png"]);
    expect(iconScript).toContain("six-plus-one-original-uploaded-logo.webp");
    expect(iconScript).toContain("ORANGE = (255, 91, 0, 255)");
    expect(iconScript).toContain("max_box = int(size * 0.90)");
    expect(svgFallback).toContain('font-size="306"');
    expect(svgFallback).toContain('fill="#FF5B00"');
    expect(svgFallback).toContain('fill="#050505"');
    expect(existsSync(join(projectRoot, "client/public/app-icon-180.png"))).toBe(true);
    expect(existsSync(join(projectRoot, "client/public/app-icon-192.png"))).toBe(true);
    expect(existsSync(join(projectRoot, "client/public/app-icon-512.png"))).toBe(true);
  });

  it("keeps Log Today stats below Must Do and uses a stable floating safe-area mobile nav", () => {
    const source = readProjectFile("client/src/pages/Home.tsx");
    const css = readProjectFile("client/src/index.css");
    const rulesIndex = source.indexOf("must-do-rules");
    const statsIndex = source.indexOf('data-testid="myday-stats-after-must-do"');
    const submitIndex = source.indexOf("submit-dock motion-submit-dock z-[70]");

    expect(rulesIndex).toBeGreaterThan(-1);
    expect(statsIndex).toBeGreaterThan(rulesIndex);
    expect(submitIndex).toBeGreaterThan(statsIndex);
    expect(source).toContain('data-testid="mobile-floating-nav"');
    expect(source).toContain("pb-[calc(0.7rem+env(safe-area-inset-bottom))]");
    expect(source).toContain('data-mobile-save-progress-above-nav="true"');
    expect(source).toContain('data-mobile-save-progress-mini-to-section="true"');
    expect(source).toContain('data-save-progress-docked={saveProgressDocked ? "true" : "false"}');
    expect(source).toContain('saveProgressDocked ? "static translate-y-0" : "fixed inset-x-4 bottom-[calc(5.85rem+env(safe-area-inset-bottom))]"');
    expect(source).toContain("z-[70]");
    expect(source).toContain("saveProgressScale");
    expect(source).toContain("data-save-progress-scale");
    expect(source).toContain('className="tab-stage tab-stage-stable overflow-hidden"');
    expect(source).toContain('data-swipe-transition="spring-slide-blur"');
    expect(source).toContain("key={activeTab}");
    expect(source).not.toContain('data-testid="pwa-install-guide"');
    expect(source).not.toContain("Browsers control installation, so the app cannot force auto-save");
    expect(css).toContain(".tab-stage-stable");
    expect(css).toContain("save-progress-shoot-home");
    expect(css).toContain("animation: none");
  });

  it("adds a reduced-motion-safe site-wide motion system for key interaction surfaces", () => {
    const source = readProjectFile("client/src/pages/Home.tsx");
    const register = readProjectFile("client/src/pages/Register.tsx");
    const calendar = readProjectFile("client/src/pages/Calendar.tsx");
    const css = readProjectFile("client/src/index.css");

    expect(source).toContain('data-motion-system="site-wide-v1"');
    expect(source).toContain("motion-card");
    expect(source).toContain("motion-press");
    expect(source).toContain("motion-progress-fill");
    expect(source).toContain("motion-tab-active");
    expect(register).toContain("motion-page");
    expect(css).toContain("Site-wide motion polish");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".motion-card");
    expect(css).toContain(".motion-press:active");
    expect(css).toContain(".motion-progress-fill");
  });
});
