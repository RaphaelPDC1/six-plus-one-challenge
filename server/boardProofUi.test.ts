import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("Board boost and Proof page UI regressions", () => {
  it("renders claimed boost cards with explicit claimant and tappable detail affordances", () => {
    expect(homeSource).toContain('data-testid="boost-slot-card"');
    expect(homeSource).toContain('data-testid="boost-claimant"');
    expect(homeSource).toContain('Won by');
    expect(homeSource).toContain('data-testid="boost-tap-hint"');
    expect(homeSource).toContain('data-testid="boost-detail-panel"');
    expect(homeSource).toContain('How it is won:');
    expect(homeSource).toContain('aria-expanded={isBoostExpanded}');
  });

  it("keeps the Proof tab content centred with the v2 layer above the normal feed", () => {
    expect(homeSource).toContain('data-testid="proof-page-centered-shell"');
    expect(homeSource).toContain('className="flex w-full justify-center"');
    expect(homeSource).toContain('data-testid="proof-page-v2-with-normal-feed"');
    expect(homeSource).toContain('className="mx-auto flex w-full max-w-[56rem] flex-col gap-4"');
    expect(homeSource).toContain('data-testid="proof-v2-top-layer"');
    expect(homeSource).toContain('data-testid="normal-proof-feed-below-v2"');
    expect(homeSource.indexOf('data-testid="proof-v2-top-layer"')).toBeLessThan(homeSource.indexOf('data-testid="normal-proof-feed-below-v2"'));
  });
});
