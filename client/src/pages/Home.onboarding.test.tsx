import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home, { LogoMark } from "./Home";

const mockState = vi.hoisted(() => ({
  auth: {
    user: { id: "user-1", name: "Taylor", email: "new@example.com", role: "user" },
    loading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  },
  snapshotQuery: {
    data: { accessState: { status: "active" } },
    isLoading: true,
    refetch: vi.fn(),
  },
  mutation: {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => React.createElement("a", { href, className }, children),
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockState.auth,
}));

vi.mock("@/const", () => ({
  getLoginUrl: () => "/login",
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: { me: { invalidate: vi.fn() } },
      challenge: { snapshot: { invalidate: vi.fn() } },
    }),
    auth: {
      siteLogin: {
        useMutation: () => mockState.mutation,
      },
    },
    signup: {
      requestAccess: {
        useMutation: () => mockState.mutation,
      },
    },
    challenge: {
      snapshot: {
        useQuery: () => mockState.snapshotQuery,
      },
      submitMyDay: {
        useMutation: () => mockState.mutation,
      },
      uploadProof: {
        useMutation: () => mockState.mutation,
      },
      applyGhostLife: {
        useMutation: () => mockState.mutation,
      },
      redeemReward: {
        useMutation: () => mockState.mutation,
      },
      completeOnboarding: {
        useMutation: () => mockState.mutation,
      },
    },
    admin: {
      confirmPayment: {
        useMutation: () => mockState.mutation,
      },
      fulfillRedemption: {
        useMutation: () => mockState.mutation,
      },
      approveSignup: {
        useMutation: () => mockState.mutation,
      },
      rejectSignup: {
        useMutation: () => mockState.mutation,
      },
    },
  },
}));

describe("Home onboarding shell", () => {
  beforeEach(() => {
    mockState.auth.user = { id: "user-1", name: "Taylor", email: "new@example.com", role: "user" };
    mockState.auth.loading = false;
    mockState.auth.isAuthenticated = true;
    mockState.snapshotQuery.data = { accessState: { status: "active" } };
    mockState.snapshotQuery.isLoading = true;
    mockState.snapshotQuery.refetch.mockClear();
    mockState.mutation.mutate.mockClear();
    mockState.mutation.mutateAsync.mockClear();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("sixone-entry-seen", "true");
    }
  });

  it("renders the uploaded brand image in the reusable logo mark instead of text-only 6+1 lettering", () => {
    const markup = renderToStaticMarkup(<LogoMark compact />);

    // Logo URL is now absolute with window.location.origin, so check for the img tag with data-testid instead
    expect(markup).toContain('data-testid="brand-logo"');
    expect(markup).toContain("alt=\"6+1 Four Lives Challenge logo\"");
    expect(markup).toContain("data-testid=\"brand-logo\"");
    expect(markup).toContain("brand-logo-shell");
    expect(markup).not.toContain("bg-black");
    expect(markup).not.toContain(">6+1</");
  });

  it("renders the real authenticated top header with the uploaded logo in the top corner", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("sticky top-0");
    // Logo URL is now absolute with window.location.origin, so check for the img tag with data-testid instead
    expect(markup).toContain('data-testid="brand-logo"');
    expect(markup).toContain("data-testid=\"brand-logo\"");
    expect(markup).toContain("Four Lives Challenge");
  });

  it("renders the public landing page with the white uploaded logo", () => {
    mockState.auth.isAuthenticated = false;
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("6+1 4 Lives Challenge");
    expect(markup).toContain("50 days. Make it count.");
    expect(markup).toContain("Remember you&#x27;re");
    expect(markup).toContain("not a civilian.");
    expect(markup).toContain("block sm:inline");
    // Logo URL is now absolute with window.location.origin, so check for the img tag with data-testid instead
    expect(markup).toContain('data-testid="brand-logo"');
    expect(markup).toContain("data-testid=\"brand-logo\"");
    expect(markup).toContain("overflow-hidden border-b");
    expect(markup).toContain("whitespace-normal break-words");
    expect(markup).toContain("max-w-[12.5rem]");
    expect(markup).toContain("max-w-full whitespace-normal break-words text-lg");
    expect(markup).toContain("sm:max-w-3xl sm:text-base");
  });

  it("keeps the public entry panel streamlined until Register is selected", () => {
    mockState.auth.isAuthenticated = false;
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("data-testid=\"entry-choice-panel\"");
    expect(markup).toContain("New challenger");
    expect(markup).toContain("Returning member");
    expect(markup).toContain("Email only. No questionnaire for existing members.");
    expect(markup).not.toContain("data-testid=\"registration-personalization\"");
    expect(markup).not.toContain("What are you here to change?");
    expect(markup).not.toContain("Display name");
  });

  it("keeps registration on a dedicated route with back-home navigation and universal Warden copy", () => {
    const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const registerSource = readFileSync(new URL("./Register.tsx", import.meta.url), "utf8");

    expect(appSource).toContain('<Route path={"/register"} component={Register} />');
    expect(homeSource).toContain('href="/register"');
    expect(homeSource).toContain('data-testid="entry-choice-panel"');
    expect(homeSource).not.toContain('data-testid="registration-personalization"');
    expect(registerSource).toContain('data-testid="dedicated-registration-form"');
    expect(registerSource).toContain('Back home');
    expect(registerSource).toContain('No Warden type selection. The Warden learns from app data and group-chat signals.');
    expect(registerSource).toContain('supportNeeded: combinedSupport');
    expect(registerSource).not.toContain('motivationStyle');
  });

  it("renders a compact public home that preserves the supplied challenge copy and no-deposit correction", () => {
    mockState.auth.isAuthenticated = false;
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Six rules. One source of truth.");
    expect(markup).toContain("Compact by default. Tap open for the exact brief.");
    expect(markup).toContain("You start with 4 lives. The only way to lose a life is to miss your daily workout.");
    expect(markup).toContain("From day one to the finish line.");
    expect(markup).toContain("These aren&#x27;t challenge rules. These are the principles and standards we should live by.");
    expect(markup).toContain("UPFRONT DEPOSIT");
    expect(markup).toContain("£0");
    expect(markup).toContain("There is no £100 upfront deposit before the challenge starts.");
    expect(markup).toContain("href=\"/register\"");
  });

  it("keeps reflections private, supports proof image upload, and constrains overview/name surfaces", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("No public reflection option. Saved privately to your challenge log.");
    expect(homeSource).toContain("onChange={reflectionText => setForm({ ...form, reflectionText, reflectionShared: false })}");
    expect(homeSource).toContain("submit.mutate({ ...form, reflectionShared: false");
    expect(homeSource).not.toContain("Make public");
    expect(homeSource).toContain("trpc.challenge.uploadProof.useMutation");
    expect(homeSource).toContain("accept=\"image/png,image/jpeg,image/webp\"");
    expect(homeSource).toContain("Image attached");
    expect(homeSource).toContain("sticky top-[58px]");
    expect(homeSource).toContain("min-w-0 overflow-hidden");
    expect(homeSource).toContain("break-words");
    expect(homeSource).toContain("owner?.displayName ?? \"Participant\"");
    expect(homeSource).not.toContain("No public proof yet");
  });

  it("wires installable web-app metadata to generated 6+1 PNG app icons", () => {
    const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const manifestSource = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");

    expect(htmlSource).toContain('rel="icon" type="image/png" sizes="192x192"');
    expect(htmlSource).toContain('rel="apple-touch-icon" sizes="180x180"');
    expect(htmlSource).toContain("/manus-storage/six-plus-one-app-icon-180_");
    expect(manifestSource).toContain('"name": "6+1 Four Lives Challenge"');
    expect(manifestSource).toContain('"purpose": "any maskable"');
    expect(manifestSource).toContain("/manus-storage/six-plus-one-app-icon-512_");
  });

  it("renders the animated landing/loading page with the white uploaded logo image instead of blue text", () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("sixone-entry-seen");
    }
    mockState.auth.loading = true;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("animated-load-page");
    expect(markup).toContain("load-mark-image");
    expect(markup).toContain("load-crosshair");
    expect(markup).toContain("load-status-panel");
    expect(markup).toContain("load-progress");
    // Logo URL is now absolute with window.location.origin, so check for the img tag with data-testid instead
    expect(markup).toContain('data-testid="brand-logo"');
    expect(markup).not.toContain("sticky top-0");
    expect(markup).not.toContain("bg-black/62");
    expect(markup).not.toContain(">6+1</");
  });

  it("keeps the animated loading logo on a fixed overlay above the sticky app header on mobile", () => {
    const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");

    expect(cssSource).toContain(".animated-load-page {\n  position: fixed;");
    expect(cssSource).toContain("z-index: 100;");
    expect(cssSource).toContain("min-height: 100dvh;");
    expect(cssSource).toContain("contain: layout paint style;");
    expect(cssSource).toContain(".load-mark {\n  position: absolute;");
    expect(cssSource).toContain("z-index: 0;");
  });

  it("renders the real unknown-email questionnaire gate from mocked app state", () => {
    mockState.snapshotQuery.data = { accessState: { status: "questionnaire_required" } };
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Unknown email");
    expect(markup).toContain("New email found. Set your profile first.");
    expect(markup).toContain("Make it yours.");
    expect(markup).toContain("new@example.com");
    // Logo URL is now absolute with window.location.origin, so check for the img tag with data-testid instead
    expect(markup).toContain('data-testid="brand-logo"');
  });
});
