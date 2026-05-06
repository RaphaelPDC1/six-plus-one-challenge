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
      auth: { me: { invalidate: vi.fn(), setData: vi.fn() } },
      challenge: { snapshot: { invalidate: vi.fn() } },
    }),
    auth: {
      siteLogin: {
        useMutation: () => mockState.mutation,
      },
      logoUrl: {
        useQuery: () => ({ data: { url: "/six-plus-one-logo.svg" } }),
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

  it("renders the actual image logo in the reusable logo mark without a stacked text fallback", () => {
    const markup = renderToStaticMarkup(<LogoMark compact />);

    expect(markup).toContain("brand-logo-shell");
    expect(markup).toContain("brand-logo-image");
    expect(markup).toContain('src="/six-plus-one-logo.svg"');
    expect(markup).not.toContain("brand-wordmark");
    expect(markup).not.toContain("bg-black");
  });

  it("renders the real authenticated top header with the uploaded logo in the top corner", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("sticky top-0");
    expect(markup).toContain("brand-logo-image");
    expect(markup).toContain('src="/six-plus-one-logo.svg"');
    expect(markup).toContain("Four Lives Challenge");
  });

  it("renders the public landing page with the inverted uploaded logo", () => {
    mockState.auth.isAuthenticated = false;
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("6+1 4 Lives Challenge");
    expect(markup).toContain("50 days. Make it count.");
    expect(markup).toContain("Remember you&#x27;re");
    expect(markup).toContain("not a civilian.");
    expect(markup).toContain("block sm:inline");
    expect(markup).toContain("brand-logo-image");
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

  it("hydrates the auth cache immediately after returning-member login so the app can open Today’s Log", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("onSuccess: async data =>");
    expect(homeSource).toContain("utils.auth.me.setData(undefined, data.user);");
    expect(homeSource.indexOf("utils.auth.me.setData(undefined, data.user);")).toBeLessThan(homeSource.indexOf("await utils.auth.me.invalidate();"));
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

  it("wires installable web-app metadata to live-safe app-origin SVG icons", () => {
    const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const manifestSource = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");

    expect(htmlSource).toContain('rel="icon" type="image/svg+xml" sizes="any" href="/app-icon.svg"');
    expect(htmlSource).toContain('rel="apple-touch-icon" href="/app-icon.svg"');
    expect(htmlSource).not.toContain("/manus-storage/six-plus-one-app-icon");
    expect(manifestSource).toContain('"name": "6+1 Four Lives Challenge"');
    expect(manifestSource).toContain('"purpose": "any maskable"');
    expect(manifestSource).toContain('"src": "/app-icon.svg"');
    expect(manifestSource).not.toContain("/manus-storage/");
  });

  it("renders the animated landing/loading page with the inverted uploaded logo image instead of blue text", () => {
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
    expect(markup).toContain("brand-logo-image");
    expect(markup).toContain('src="/six-plus-one-logo.svg"');
    expect(markup).not.toContain("sticky top-0");
    expect(markup).not.toContain("bg-black/62");
    expect(markup).not.toContain("brand-wordmark");
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

  it("uses one stable inverted logo image source without old-asset swaps or text fallback paths", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const registerSource = readFileSync(new URL("./Register.tsx", import.meta.url), "utf8");
    const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const manifestSource = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const storageProxySource = readFileSync(new URL("../../../server/_core/storageProxy.ts", import.meta.url), "utf8");
    const logoSvgSource = readFileSync(new URL("../../public/six-plus-one-logo.svg", import.meta.url), "utf8");
    const appIconSvgSource = readFileSync(new URL("../../public/app-icon.svg", import.meta.url), "utf8");

    expect(homeSource).toContain('const BRAND_LOGO_URL = "/six-plus-one-logo.svg";');
    expect(homeSource).toContain('data-logo-source="app-origin-brand-svg"');
    expect(homeSource).not.toContain("six-plus-one-original-uploaded-logo_aefa948f.webp");
    expect(homeSource).not.toContain("BrandWordmark");
    expect(homeSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(registerSource).toContain('const BRAND_LOGO_URL = "/six-plus-one-logo.svg";');
    expect(registerSource).toContain('data-logo-source="app-origin-brand-svg"');
    expect(registerSource).not.toContain("setLogoFailed");
    expect(registerSource).not.toContain("onError={() => setLogoFailed(true)}");
    expect(registerSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(htmlSource).toContain("/app-icon.svg");
    expect(manifestSource).toContain("/app-icon.svg");
    expect(routerSource).toContain('return { url: "/six-plus-one-logo.svg" };');
    expect(routerSource).not.toContain("six-plus-one-original-uploaded-logo_aefa948f.webp");
    expect(routerSource).not.toContain("six-plus-one-clean-stacked-logo_a45938fa.png");
    expect(routerSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(logoSvgSource).toContain('fill="#FFFFFF"');
    expect(logoSvgSource).toContain('stroke="#F2D37C"');
    expect(logoSvgSource).toContain('stop-color="#FFF1B8"');
    expect(logoSvgSource).toContain('fill="#FFF4C7"');
    expect(logoSvgSource).not.toContain('opacity="0.32"');
    expect(appIconSvgSource).toContain('fill="#FFFFFF"');
    expect(appIconSvgSource).toContain('stroke="#F2D37C"');

    expect(storageProxySource).toContain("assetResp.arrayBuffer()");
    expect(storageProxySource).toContain("cachePolicyForKey(key)");
    expect(storageProxySource).toContain("stale-while-revalidate=604800");
    expect(storageProxySource).not.toContain("res.redirect(307, url)");
    expect(storageProxySource).not.toContain('res.set("Cache-Control", "no-store")');
  });

  it("keeps proof uploads on origin-stable storage URLs for deployed mobile browsers", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const storageProxySource = readFileSync(new URL("../../../server/_core/storageProxy.ts", import.meta.url), "utf8");

    expect(homeSource).toContain('if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;');
    expect(homeSource).toContain("function ProofImage");
    expect(homeSource).toContain("src={src}");
    expect(homeSource).toContain('loading="lazy"');
    expect(homeSource).toContain('decoding="async"');
    expect(routerSource).toContain("const stored = await storagePut(`exercise-proof/participant-${participant.id}/${Date.now()}-${safeName}.${extension}`, bytes, input.mimeType);");
    expect(routerSource).toContain("url: stored.url");
    expect(storageProxySource).toContain("/api/storage-image/*");
    expect(storageProxySource).toContain("Content-Type");
    expect(storageProxySource).toContain("X-Content-Type-Options");
  });

  it("keeps participant display pictures and paid reward visuals wired through real image-aware components", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("function normaliseProfilePhotoUrl");
    expect(homeSource).toContain("/^data:image\\/(png|jpeg|webp);base64,/i.test(trimmed)");
    expect(homeSource).toContain("function ProfilePhoto");
    expect(homeSource).toContain("loading=\"lazy\" decoding=\"async\"");
    expect(homeSource).toContain("<RewardVisual reward={reward} />");
    expect(homeSource).toContain("<RewardVisual reward={reward} compact />");
    expect(homeSource).toContain("<ProfilePhoto participant={owner} className=\"h-12 w-12 shrink-0\" />");
  });

  it("renders the real unknown-email questionnaire gate from mocked app state", () => {
    mockState.snapshotQuery.data = { accessState: { status: "questionnaire_required" } };
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Unknown email");
    expect(markup).toContain("New email found. Set your profile first.");
    expect(markup).toContain("Make it yours.");
    expect(markup).toContain("new@example.com");
    expect(markup).toContain("brand-logo-image");
  });

  it("keeps the six-rule log framed as a must-do checklist with compact feedback and locked Ghost Life hooks", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("Must-do today");
    expect(homeSource).toContain("Six rules. No misses.");
    expect(homeSource).toContain("still required");
    expect(homeSource).toContain("Done — locked in");
    expect(homeSource).toContain("function pulse(pattern: number | number[] = 18)");
    expect(homeSource).toContain("navigator.vibrate(pattern)");
    expect(homeSource).toContain("function playDoneCue()");
    expect(homeSource).toContain("AudioContext");
    expect(homeSource).toContain("const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);");
    expect(homeSource).toContain('data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}');
    expect(homeSource).toContain("Ghost Life locked");
    expect(homeSource).toContain("Your Purple Ghost Life has already restored a life. It is now locked for the rest of the challenge.");
    expect(homeSource).toContain("Draft only. Lives judged after rollover.");
    expect(homeSource).toContain("window.setTimeout(() => setSaveNotice(null), 2200);");
    expect(homeSource).not.toContain("Progress saved quietly");
    expect(homeSource).not.toContain("No life lost before rollover");
  });

  it("uses persistent cookies and local daily draft recovery for returning participants", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const cookieSource = readFileSync(new URL("../../../server/_core/cookies.ts", import.meta.url), "utf8");

    expect(cookieSource).toContain('import { ONE_YEAR_MS } from "@shared/const";');
    expect(cookieSource).toContain("maxAge: ONE_YEAR_MS");
    expect(homeSource).toContain('const DRAFT_STORAGE_PREFIX = "draft_6plus1";');
    expect(homeSource).toContain('`${DRAFT_STORAGE_PREFIX}_${userId}_day${dayNumber}`');
    expect(homeSource).toContain("window.localStorage.setItem(draftStorageKey");
    expect(homeSource).toContain("window.localStorage.removeItem(draftStorageKey);");
    expect(homeSource).toContain("Draft restored");
    expect(homeSource).toContain("setForm(dailyLogToForm(snapshot?.myLog));");
  });

  it("uses a compact flick-card calendar with an expandable full journey view", () => {
    const calendarSource = readFileSync(new URL("./Calendar.tsx", import.meta.url), "utf8");

    expect(calendarSource).toContain("Flick calendar");
    expect(calendarSource).toContain("Expand full calendar");
    expect(calendarSource).toContain("Hide full calendar");
    expect(calendarSource).toContain("setExpanded(value => !value)");
    expect(calendarSource).toContain("full journey map");
  });

  it("makes Board participant cards tappable and lets display pictures enlarge from the stats sheet", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("const [selected, setSelected] = useState<any>(null);");
    expect(homeSource).toContain("aria-label={`Open ${p.displayName} participant stats`}");
    expect(homeSource).toContain("<ParticipantSheet participant={selected} onClose={() => setSelected(null)} />");
    expect(homeSource).toContain("const [photoExpanded, setPhotoExpanded] = useState(false);");
    expect(homeSource).toContain("enlargeable onOpen={() => setPhotoExpanded(true)}");
    expect(homeSource).toContain("Close enlarged display picture");
  });

});
