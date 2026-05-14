import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home, { LogoMark, buildProofWardenInsight, dailyLogToForm, getLeaderboardVisiblePoints, getMillisecondsUntilNextLondonDay, isIntentionalPageSwipe, isPageSwipeExcludedTarget, mergeTodayFormWithoutWipingSavedWork, patchDailyLogIntoSnapshot, sortProofLogsNewestFirst } from "./Home";
import { buildParticipantInsights } from "@/lib/challengeInsights";

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
  deepThoughtsQuery: {
    data: {},
    isLoading: false,
  },
  releaseNoteQuery: {
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  },
  participantHistoryQuery: {
    data: [],
    isLoading: false,
    refetch: vi.fn(),
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
      challenge: {
        snapshot: { invalidate: vi.fn() },
        latestReleaseNote: { invalidate: vi.fn() },
        participantHistory: { invalidate: vi.fn() },
      },
    }),
    auth: {
      siteLogin: {
        useMutation: () => mockState.mutation,
      },
      logoUrl: {
        useQuery: () => ({ data: { url: "/manus-storage/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp" } }),
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
      deepThoughts: {
        useQuery: () => mockState.deepThoughtsQuery,
      },
      participantHistory: {
        useQuery: () => mockState.participantHistoryQuery,
      },
      latestReleaseNote: {
        useQuery: () => mockState.releaseNoteQuery,
      },
      acknowledgeReleaseNote: {
        useMutation: () => mockState.mutation,
      },
      createReleaseNote: {
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
    mockState.deepThoughtsQuery.data = {};
    mockState.deepThoughtsQuery.isLoading = false;
    mockState.releaseNoteQuery.data = null;
    mockState.releaseNoteQuery.isLoading = false;
    mockState.releaseNoteQuery.refetch.mockClear();
    mockState.participantHistoryQuery.data = [];
    mockState.participantHistoryQuery.isLoading = false;
    mockState.participantHistoryQuery.refetch.mockClear();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("sixone-entry-seen", "true");
    }
  });

  it("preserves saved same-day completed rules when a local draft is restored", () => {
    const savedToday = dailyLogToForm({
      noAlcohol: true,
      cleanEating: true,
      exerciseDuration: 35,
      exerciseType: "Run",
      reflectionText: "Kept my promise today.",
      readTeachText: "Shared a lesson with the group.",
      trackedEverything: true,
    });

    const staleDraft = dailyLogToForm({
      cleanEatingNote: "Draft note only",
      exerciseDuration: 5,
      exerciseType: "",
      reflectionText: "",
      readTeachText: "",
    });

    const merged = mergeTodayFormWithoutWipingSavedWork(savedToday, staleDraft);

    expect(merged.noAlcohol).toBe(true);
    expect(merged.cleanEating).toBe(true);
    expect(merged.exerciseDuration).toBe(35);
    expect(merged.exerciseType).toBe("Run");
    expect(merged.reflectionText).toBe("Kept my promise today.");
    expect(merged.readTeachText).toBe("Shared a lesson with the group.");
    expect(merged.trackedEverything).toBe(true);
  });

  it("allows new same-day draft progress to add green rules without removing saved work", () => {
    const savedToday = dailyLogToForm({
      noAlcohol: true,
      cleanEating: false,
      exerciseDuration: 0,
      exerciseType: "",
      reflectionText: "Morning reflection done.",
      readTeachText: "",
      trackedEverything: false,
    });

    const currentDraft = dailyLogToForm({
      cleanEating: true,
      exerciseDuration: 45,
      exerciseType: "Gym",
      readTeachText: "Discipline compounds.",
      trackedEverything: true,
    });

    const merged = mergeTodayFormWithoutWipingSavedWork(savedToday, currentDraft);

    expect(merged.noAlcohol).toBe(true);
    expect(merged.cleanEating).toBe(true);
    expect(merged.exerciseDuration).toBe(45);
    expect(merged.exerciseType).toBe("Gym");
    expect(merged.reflectionText).toBe("Morning reflection done.");
    expect(merged.readTeachText).toBe("Discipline compounds.");
    expect(merged.trackedEverything).toBe(true);
  });

  it("computes the next Today’s Log reset from the Europe/London midnight boundary", () => {
    expect(getMillisecondsUntilNextLondonDay(new Date("2026-05-06T22:59:30.000Z"))).toBe(30_000);
    expect(getMillisecondsUntilNextLondonDay(new Date("2026-05-06T23:00:00.000Z"))).toBe(24 * 60 * 60 * 1000);
    expect(getMillisecondsUntilNextLondonDay(new Date("2026-12-06T23:59:30.000Z"))).toBe(30_000);
  });

  it("shows Points in Play as the canonical leaderboard total without adding unsubmitted live-task projections", () => {
    const participant = { totalPoints: 89, canonicalTotalPoints: 99 };

    expect(getLeaderboardVisiblePoints(participant)).toBe(99);
  });

  it("falls back to stored total points when a canonical leaderboard total is unavailable", () => {
    const participant = { totalPoints: 89 };

    expect(getLeaderboardVisiblePoints(participant)).toBe(89);
  });

  it("patches a submitted same-day proof log and leaderboard points into the shared snapshot cache", () => {
    const staleSnapshot = {
      participant: { id: 42, displayName: "Taylor", totalPoints: 20, daysComplete: 2 },
      participants: [
        { id: 42, displayName: "Taylor", totalPoints: 25, baseTotalPoints: 20, boostPoints: 5, canonicalTotalPoints: 25, daysComplete: 2 },
        { id: 18, displayName: "Riley", totalPoints: 31, baseTotalPoints: 31, boostPoints: 0, canonicalTotalPoints: 31, daysComplete: 3 },
      ],
      myLog: { id: 7, participantId: 42, dayNumber: 9, exerciseProofUrl: "" },
      logs: [
        { id: 7, participantId: 42, dayNumber: 9, exerciseProofUrl: "", exerciseDuration: 30 },
        { id: 6, participantId: 18, dayNumber: 9, exerciseProofUrl: "/manus-storage/other.webp", exerciseDuration: 35 },
      ],
    };
    const updatedLog = { id: 7, participantId: 42, dayNumber: 9, exerciseProofUrl: "/manus-storage/new-proof.webp", exerciseDuration: 45 };
    const updatedParticipant = { id: 42, displayName: "Taylor", totalPoints: 30, daysComplete: 3 };

    const patched = patchDailyLogIntoSnapshot(staleSnapshot, updatedLog, updatedParticipant) as typeof staleSnapshot;

    const patchedParticipant = patched.participant as any;
    expect(patched.myLog?.exerciseProofUrl).toBe("/manus-storage/new-proof.webp");
    expect(patchedParticipant.baseTotalPoints).toBe(30);
    expect(patchedParticipant.boostPoints).toBe(5);
    expect(patchedParticipant.canonicalTotalPoints).toBe(35);
    expect(patchedParticipant.totalPoints).toBe(35);
    expect(patchedParticipant.daysComplete).toBe(3);
    expect(patched.participants[0].baseTotalPoints).toBe(30);
    expect(patched.participants[0].boostPoints).toBe(5);
    expect(patched.participants[0].canonicalTotalPoints).toBe(35);
    expect(patched.participants[0].totalPoints).toBe(35);
    expect(patched.participants[1].totalPoints).toBe(31);
    expect(patched.logs).toHaveLength(2);
    expect(patched.logs[0].exerciseProofUrl).toBe("/manus-storage/new-proof.webp");
    expect(patched.logs[0].exerciseDuration).toBe(45);
    expect(patched.logs[1].exerciseProofUrl).toBe("/manus-storage/other.webp");
  });

  it("renders the actual image logo in the reusable logo mark without a stacked text fallback", () => {
    const markup = renderToStaticMarkup(<LogoMark compact />);

    expect(markup).toContain("brand-logo-shell");
    expect(markup).toContain("brand-logo-top-left");
    expect(markup).toContain("brand-logo-image");
    expect(markup).toContain('src="/api/storage-image/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp"');
    expect(markup).toContain('data-logo-placement="top-left-corner"');
    expect(markup).not.toContain("brand-wordmark");
    expect(markup).not.toContain("bg-black");
  });

  it("renders the real authenticated top header with the uploaded logo in the top corner", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("sticky top-0");
    expect(markup).toContain("brand-logo-top-left");
    expect(markup).toContain("brand-logo-image");
    expect(markup).toContain('src="/api/storage-image/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp"');
    expect(markup).toContain('data-logo-placement="top-left-corner"');
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
    expect(homeSource).toContain("getMillisecondsUntilNextLondonDay(new Date()) + 1500");
    expect(homeSource).toContain("void snapshotQuery.refetch();");
    expect(homeSource).toContain("void utils.challenge.snapshot.invalidate();");
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
    expect(registerSource).toContain('Back to base');
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

  it("keeps reflections private, supports proof image/video upload, and constrains overview/name surfaces", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("No public reflection option. Saved privately to your challenge log.");
    expect(homeSource).toContain("onChange={reflectionText => setForm({ ...form, reflectionText, reflectionShared: false })}");
    expect(homeSource).toContain("submit.mutate({ ...form, reflectionShared: false");
    expect(homeSource).not.toContain("Make public");
    expect(homeSource).toContain("trpc.challenge.uploadProof.useMutation");
    expect(homeSource).toContain("accept=\"image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime\"");
    expect(homeSource).toContain("function ProofCarousel");
    expect(homeSource).toContain("data-testid=\"proof-native-scroll-rail\"");
    expect(homeSource).toContain("snap-x snap-mandatory");
    expect(homeSource).toContain("data-testid=\"proof-swipe-prompt\"");
    expect(homeSource).toContain("Swipe to view all");
    expect(homeSource).toContain("{index + 1}/{items.length}");
    expect(homeSource).toContain("min-w-[88%] snap-start");
    expect(homeSource).not.toContain("<Carousel opts=");
    expect(homeSource).not.toContain("<CarouselContent");
    expect(homeSource).toContain("data-testid=\"proof-upload-video-preview\"");
    expect(homeSource).toContain("data-testid=\"proof-feed-video-autoplay\"");
    expect(homeSource).toContain("muted autoPlay loop playsInline controls");
    expect(homeSource).toContain("<video className=\"h-full w-full bg-black object-cover\"");
    expect(homeSource).toContain("<source src={src} type={proofVideoMimeType(item.url, item.mimeType)} />");
    expect(homeSource).toContain("function proofVideoMimeType");
    expect(homeSource).toContain("declaredType === \"video\" || isProofVideoUrl(url, mimeType)");
    expect(homeSource).toContain("return [{ url: raw, type: isProofVideoUrl(raw) ? \"video\"");
    expect(homeSource).toContain("encodeProofMediaAfterRemoval(current.exerciseProofUrl, index)");
    expect(homeSource).toContain("data-testid=\"proof-feed-redesign\"");
    expect(homeSource).toContain("data-testid=\"proof-content-visible\"");
    expect(homeSource).toContain("bg-black object-cover");
    expect(homeSource).not.toContain("opacity-85");
    expect(homeSource).not.toContain("bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)]");
    expect(homeSource).toContain("ownerName?: string");
    expect(homeSource).toContain("data-testid=\"proof-readable-card\"");
    expect(homeSource).toContain("data-testid=\"proof-readable-teaching\"");
    expect(homeSource).toContain("text-[13px] font-bold italic leading-5 text-[#F1F1F1]");
    expect(homeSource).toContain("data-testid=\"mobile-floating-nav\"");
    expect(homeSource).toContain("min-w-0 overflow-hidden");
    expect(homeSource).toContain("break-words");
    expect(homeSource).toContain("owner?.displayName ?? \"Participant\"");
    expect(homeSource).not.toContain("No public proof yet");
  });

  it("uses stable Proof and participant-profile query inputs to avoid crash-prone remount loops", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("const participantHistoryInput = useMemo(() => ({ participantId: Number(visibleParticipant?.id ?? 0) }), [visibleParticipant?.id]);");
    expect(homeSource).toContain("trpc.challenge.participantHistory.useQuery(\n    participantHistoryInput,");
    expect(homeSource.indexOf("trpc.challenge.participantHistory.useQuery(\n    participantHistoryInput,")).toBeLessThan(homeSource.indexOf("if (!visibleParticipant) return null;"));
    expect(homeSource).toContain("const deepThoughtInput = useMemo(() => ({ logIds: deepThoughtLogIds }), [deepThoughtLogIds]);");
    expect(homeSource).toContain("trpc.challenge.deepThoughts.useQuery(deepThoughtInput");
    expect(homeSource).toContain("data-testid=\"proof-native-scroll-rail\"");
    expect(homeSource).not.toContain("<Carousel opts=");
  });

  it("sorts Proof posts newest-first before rendering the v2 layer and normal feed", () => {
    const unorderedLogs = [
      { id: 101, dayNumber: 4, createdAt: "2026-05-04T19:00:00.000Z", exerciseProofUrl: "/proof-day-4.webp" },
      { id: 103, dayNumber: 6, createdAt: "2026-05-06T08:00:00.000Z", exerciseProofUrl: "/proof-day-6-early.webp" },
      { id: 102, dayNumber: 5, createdAt: "2026-05-05T19:00:00.000Z", exerciseProofUrl: "/proof-day-5.webp" },
      { id: 104, dayNumber: 6, createdAt: "2026-05-06T21:00:00.000Z", exerciseProofUrl: "/proof-day-6-late.webp" },
    ];

    expect(sortProofLogsNewestFirst(unorderedLogs).map(log => log.id)).toEqual([104, 103, 102, 101]);
    expect(unorderedLogs.map(log => log.id)).toEqual([101, 103, 102, 104]);
  });

  it("uses the backend Deep Thought query and does not show visible meta-source copy", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("data-testid=\"proof-deep-thought\"");
    expect(homeSource).toContain("Deep thought</MicroLabel>");
    expect(homeSource).toContain("trpc.challenge.deepThoughts.useQuery");
    expect(homeSource).toContain("Reading the quote, proof, and recent pattern before speaking");
    expect(homeSource).toContain("Context read");
    expect(homeSource).toContain("deepThoughtQuery.data?.[String(log.id)]?.insight");
    expect(homeSource).toContain("deepThoughtQuery.data?.[String(log.id)]?.insight");
    expect(homeSource).not.toContain("Generated from proof presence + exercise log + challenge context. No fake image reading.");
    expect(homeSource).not.toContain("No fake image reading");
    expect(homeSource).not.toMatch(/Ren[eé]e/);
  });

  it("wires installable web-app metadata to live-safe reference palette image icons", () => {
    const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const manifestSource = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");

    expect(htmlSource).toContain('rel="icon" type="image/png" sizes="192x192" href="/app-icon-192.png"');
    expect(htmlSource).toContain('rel="apple-touch-icon" sizes="180x180" href="/app-icon-180.png"');
    expect(htmlSource).toContain('name="apple-mobile-web-app-title" content="6+1 Four Lives Challenge"');
    expect(htmlSource).not.toContain("/manus-storage/six-plus-one-app-icon");
    expect(manifestSource).toContain('"name": "6+1 Four Lives Challenge"');
    expect(manifestSource).toContain('"short_name": "6+1 Challenge"');
    expect(manifestSource).toContain('"purpose": "any maskable"');
    expect(manifestSource).toContain('"src": "/app-icon-192.png"');
    expect(manifestSource).toContain('"src": "/app-icon-512.png"');
    expect(manifestSource).not.toContain("/manus-storage/");
  });

  it("renders the animated landing/loading page with the reference-style palette logo image instead of blue text", () => {
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
    expect(markup).toContain('src="/api/storage-image/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp"');
    expect(markup).toContain('data-logo-placement="loading-page"');
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
    expect(cssSource).toContain(".brand-logo-top-left");
    expect(cssSource).toContain("width: min(86vw, 28rem);");
    expect(cssSource).toContain("width: clamp(13rem, 78vw, 21rem);");
  });

  it("uses the previously generated image logo without reverting to the broken SVG or older asset swaps", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const registerSource = readFileSync(new URL("./Register.tsx", import.meta.url), "utf8");
    const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const manifestSource = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const storageProxySource = readFileSync(new URL("../../../server/_core/storageProxy.ts", import.meta.url), "utf8");
    const appIconSvgSource = readFileSync(new URL("../../public/app-icon.svg", import.meta.url), "utf8");

    expect(homeSource).toContain('const BRAND_LOGO_STORAGE_KEY = "six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp";');
    expect(homeSource).toContain('const BRAND_LOGO_URL = `/api/storage-image/${encodeURIComponent(BRAND_LOGO_STORAGE_KEY)}`;');
    expect(homeSource).toContain('data-logo-source="optimized-webp-proxy"');
    expect(homeSource).toContain('data-logo-source="optimized-webp-fallback"');
    expect(homeSource).toContain('onError={() => setFailed(true)}');
    expect(homeSource).not.toContain("six-plus-one-original-uploaded-logo_aefa948f.webp");
    expect(homeSource).not.toContain("BrandWordmark");
    expect(homeSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(registerSource).toContain('const BRAND_LOGO_STORAGE_KEY = "six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp";');
    expect(registerSource).toContain('const BRAND_LOGO_URL = `/api/storage-image/${encodeURIComponent(BRAND_LOGO_STORAGE_KEY)}`;');
    expect(registerSource).toContain('data-logo-source="optimized-webp-proxy"');
    expect(registerSource).toContain('data-logo-source="optimized-webp-fallback"');
    expect(registerSource).toContain("const [failed, setFailed] = useState(false);");
    expect(registerSource).toContain("onError={() => setFailed(true)}");
    expect(registerSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(htmlSource).toContain("/app-icon-192.png");
    expect(htmlSource).toContain("/app-icon-180.png");
    expect(manifestSource).toContain("/app-icon-192.png");
    expect(manifestSource).toContain("/app-icon-512.png");
    expect(routerSource).toContain('return { url: "/manus-storage/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp" };');
    expect(routerSource).not.toContain("six-plus-one-original-uploaded-logo_aefa948f.webp");
    expect(routerSource).not.toContain("six-plus-one-clean-stacked-logo_a45938fa.png");
    expect(routerSource).not.toContain("six-plus-one-brand-logo-white-strong_2665284a.png");

    expect(homeSource).toContain("six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp");
    expect(registerSource).toContain("six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp");
    expect(routerSource).toContain("six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp");
    expect(homeSource).not.toContain("six-plus-one-reference-palette-logo-transparent_9ff37cae.png");
    expect(registerSource).not.toContain("six-plus-one-reference-palette-logo-transparent_9ff37cae.png");
    expect(routerSource).not.toContain("six-plus-one-reference-palette-logo-transparent_9ff37cae.png");
    expect(homeSource).not.toContain('BRAND_LOGO_URL = "/six-plus-one-logo.svg"');
    expect(registerSource).not.toContain('BRAND_LOGO_URL = "/six-plus-one-logo.svg"');
    expect(routerSource).not.toContain('url: "/six-plus-one-logo.svg"');
    expect(appIconSvgSource).toContain('fill="#FF5B00"');
    expect(appIconSvgSource).toContain('fill="#050505"');

    expect(storageProxySource).toContain("Readable.fromWeb(assetResp.body as any)");
    expect(storageProxySource).toContain("cachePolicyForKey(key)");
    expect(storageProxySource).toContain("stale-while-revalidate=604800");
    expect(storageProxySource).toContain('res.set("Accept-Ranges", assetResp.headers.get("accept-ranges") || "bytes")');
    expect(storageProxySource).not.toContain("res.redirect(307, url)");
    expect(storageProxySource).not.toContain('res.set("Cache-Control", "no-store")');
  });

  it("documents the Claude-inspired Overview, Board, Save Progress dock, and all-green haptic submit flow", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const hapticsSource = readFileSync(new URL("../lib/haptics.ts", import.meta.url), "utf8");
    const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");

    expect(homeSource).toContain('data-testid="overview-metrics-dashboard"');
    expect(homeSource).toContain('data-testid="overview-red-alert-pace-card"');
    expect(homeSource).toContain("Challenge state");
    expect(homeSource).toContain("Days left");
    expect(homeSource).toContain("tap for wins");
    expect(homeSource).toContain('data-testid="overview-intelligence-grid"');
    expect(homeSource).toContain('data-testid="personal-rivalry-cards"');
    expect(homeSource).toContain("The gap above. The threat below.");
    expect(homeSource).toContain('data-testid="overview-compare-list"');
    expect(homeSource).toContain("Banked today");
    expect(homeSource).toContain('data-testid="pace-bar"');
    expect(homeSource).toContain("The <span");
    expect(homeSource).toContain('data-testid="boost-key-slots"');
    expect(homeSource).toContain('data-testid="boost-key-summary-toggle"');
    expect(homeSource).toContain('data-testid="boost-key-collapsible-panel"');
    expect(homeSource).toContain("Boost tokens tucked away.");
    expect(homeSource).toContain('data-testid="overview-active-boosts"');
    expect(homeSource).toContain('data-testid="warden-mood-card"');
    expect(homeSource).toContain("+5 bonus available");
    expect(homeSource).toContain("const saveProgressDocked = saveProgressScale >= 0.78;");
    expect(homeSource).toContain('data-mobile-save-progress-mini-to-section="true"');
    expect(homeSource).toContain('data-save-progress-docked={saveProgressDocked ? "true" : "false"}');
    expect(homeSource).toContain('saveProgressDocked ? "static translate-y-0" : "fixed inset-x-4 bottom-[calc(5.85rem+env(safe-area-inset-bottom))]"');
    expect(homeSource).toContain("max-w-[9.5rem]");
    expect(homeSource).toContain("before:content-['SAVE']");
    expect(cssSource).toContain('save-progress-shoot-home 260ms cubic-bezier(0.2, 0.9, 0.25, 1)');
    expect(cssSource).toContain('@keyframes save-progress-shoot-home');
    expect(homeSource).toContain("playAllGreenSubmitHaptic();");
    expect(homeSource).toContain("if (data?.complete)");
    expect(hapticsSource).toContain("submit: [28, 42, 28, 64, 72]");
    expect(hapticsSource).toContain('const VISUAL_HAPTIC_CLASS = "haptic-visual-feedback";');
    expect(hapticsSource).toContain('window.dispatchEvent(new CustomEvent("sixplusone:haptic"');
  });

  it("keeps the Proof v2 feature layer above the preserved normal feed", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("function ProofV2TopLayer");
    expect(homeSource).toContain('data-testid="proof-page-v2-with-normal-feed"');
    expect(homeSource).toContain('data-testid="proof-v2-top-layer"');
    expect(homeSource).toContain('data-testid="proof-v2-command-deck"');
    expect(homeSource).toContain('data-testid="proof-v2-featured-receipt"');
    expect(homeSource).toContain('data-testid="proof-v2-latest-grid"');
    expect(homeSource).toContain('data-testid="proof-v2-pressure-card"');
    expect(homeSource).toContain('data-testid="normal-proof-feed-below-v2"');
    expect(homeSource).toContain("Proof, insights, comments, and reactions from the group.");
    expect(homeSource.indexOf('data-testid="proof-v2-top-layer"')).toBeLessThan(homeSource.indexOf('data-testid="normal-proof-feed-below-v2"'));
    expect(homeSource.indexOf('data-testid="normal-proof-feed-below-v2"')).toBeLessThan(homeSource.indexOf('data-testid="proof-readable-card"'));
    expect(homeSource).toContain('data-testid="proof-deep-thought"');
    expect(homeSource).toContain('data-testid={`proof-reaction-${reaction.key}`}');
    expect(homeSource).toContain('data-testid="proof-comment-input"');
  });

  it("keeps proof uploads on origin-stable storage URLs for deployed mobile browsers", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const storageProxySource = readFileSync(new URL("../../../server/_core/storageProxy.ts", import.meta.url), "utf8");

    expect(homeSource).toContain('if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;');
    expect(homeSource).toContain("function proofMediaSrc(item: ProofMediaItem)");
    expect(homeSource).toContain("if (proofMediaType(item) === \"video\")");
    expect(homeSource).toContain("function ProofImage");
    expect(homeSource).toContain("src={src}");
    expect(homeSource).toContain('loading="lazy"');
    expect(homeSource).toContain('decoding="async"');
    expect(routerSource).toContain("const stored = await storagePut(`exercise-proof/participant-${participant.id}/${Date.now()}-${safeName}.${extension}`, bytes, input.mimeType);");
    expect(routerSource).toContain("mediaType: input.mimeType.startsWith");
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
    expect(homeSource).toContain("RewardVisual");
    expect(homeSource).toContain("<ProfilePhoto participant={owner} className=\"h-12 w-12 shrink-0\" />");
  });

  it("renders the real unknown-email questionnaire gate from mocked app state", () => {
    mockState.snapshotQuery.data = { accessState: { status: "questionnaire_required" } };
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Entry gate");
    expect(markup).toContain("Enter the challenge");
    expect(markup).toContain("Enter the challenge");
    expect(markup).toContain("new@example.com");
    expect(markup).toContain("brand-logo-image");
  });

  it("keeps the six-rule log framed as a must-do checklist with compact feedback and locked Ghost Life hooks", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("Daily Checklist");
    expect(homeSource).toContain("must-do-rules");
    expect(homeSource).toContain("myday-stats-after-must-do");
    expect(homeSource).toContain('data-testid="myday-stats-after-must-do"');
    expect(homeSource).toContain("liveTaskPoints");
    expect(homeSource).toContain("liveTaskPoints.visibleTotal");
    expect(homeSource).toContain("motion-page grid min-w-0 max-w-full gap-0 overflow-x-hidden");
    expect(homeSource).toContain("must-do-rules min-w-0 max-w-full");
    expect(homeSource).toContain("grid-cols-4");
    expect(homeSource).not.toContain("flex max-w-full snap-x gap-1 overflow-x-auto overscroll-x-contain");
    expect(homeSource).not.toContain("snap-start overflow-hidden");
    expect(homeSource).toContain("liveTaskPoints.visibleTotal");
    expect(homeSource).toContain("w-[min(100%,calc(100vw-2rem))] max-w-full");
    expect(homeSource).toContain("max-w-[9.5rem] rounded-full border border-[#C8A96E]/45 bg-[#070707]/94 p-1");
    expect(homeSource).toContain("max-w-[15rem] rounded-full border border-[#C8A96E]/55 bg-[#0D0D0D]/95 p-1.5");
    expect(homeSource).toContain("rounded-full px-3 py-2 text-[0px]");
    expect(homeSource).toContain("rounded-full px-4 py-3 text-[10px]");
    expect(readFileSync(new URL("../index.css", import.meta.url), "utf8")).toContain("overflow-x: hidden;");
    expect(homeSource).not.toContain('data-testid="live-task-points-panel"');
    expect(homeSource).toContain("Draft only until 5/6 is real. Lives are judged at rollover.");
    expect(homeSource).toContain("function pulse(pattern: number | number[] = 18)");
    expect(homeSource).toContain("navigator.vibrate(pattern)");
    expect(homeSource).toContain("haptics.tap();");
    expect(homeSource).toContain("function playDoneCue()");
    expect(homeSource).toContain("AudioContext");
    expect(homeSource).toContain("const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);");
    expect(homeSource).toContain('data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}');
    expect(homeSource).toContain("Ghost Life locked");
    expect(homeSource).toContain("Your Purple Ghost Life has already restored a life. It is now locked for the rest of the challenge.");
    expect(homeSource).toContain("Draft only until 5/6 is real. Lives are judged at rollover.");
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
    expect(homeSource).toContain("Draft recovered");
    expect(homeSource).toContain("const savedToday = dailyLogToForm(snapshot?.myLog);");
    expect(homeSource).toContain("setForm(mergeTodayFormWithoutWipingSavedWork(savedToday, storedDraft));");
    expect(homeSource).toContain("setForm(savedToday);");
  });

  it("uses a compact flick-card calendar with an expandable full journey view", () => {
    const calendarSource = readFileSync(new URL("./Calendar.tsx", import.meta.url), "utf8");

    expect(calendarSource).toContain("50-day campaign");
    expect(calendarSource).toContain("Open full map");
    expect(calendarSource).toContain("Hide full map");
    expect(calendarSource).toContain("setMapExpanded(v => !v)");
    expect(calendarSource).toContain("50-day campaign");
  });

  it("makes Board participant cards tappable with a mobile-readable sheet, back navigation, and enlarged display pictures", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("const [selected, setSelected] = useState<any>(null);");
    expect(homeSource).toContain("const [expandedParticipantId, setExpandedParticipantId] = useState<string | number | null>(null);");
    expect(homeSource).toContain("data-testid=\"board-player-status-line\"");
    expect(homeSource).toContain("data-testid=\"board-player-expanded-metrics\"");
    expect(homeSource).toContain("function LifeDots");
    expect(homeSource).toContain('data-testid=\"life-dots\"');
    expect(homeSource).toContain('data-testid=\"stepped-podium-card\"');
    expect(homeSource).toContain('data-testid=\"full-board-compare-list\"');
    expect(homeSource).toContain('data-testid=\"elimination-risk-badge\"');
    expect(homeSource).toContain("⚠ ELIMINATION RISK");
    expect(homeSource).toContain("inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden");
    expect(homeSource).toContain("<span className=\"min-w-0 truncate tabular-nums\">{value}</span>");
    expect(homeSource).toContain("block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E]");
    expect(homeSource).toContain("aria-label={`Toggle ${p.displayName} Board metrics`}");
    expect(homeSource).toContain("aria-label={`Open ${p.displayName} participant stats`}");
    expect(homeSource).toContain("Detail view · {p.comparisonLine}");
    expect(homeSource).toContain("{p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}");
    expect(homeSource).toContain("<ParticipantSheet participant={selected} onClose={() => setSelected(null)} />");
    expect(homeSource).toContain('data-mobile-podium-layout="horizontal-stepped"');
    expect(homeSource).toContain('aria-label="Top three arranged as a horizontal mobile podium: second, first, third"');
    expect(homeSource.indexOf("{podium[0] && <PodiumCard")).toBeLessThan(homeSource.indexOf("{podium[1] && <PodiumCard"));
    expect(homeSource.indexOf("{podium[1] && <PodiumCard")).toBeLessThan(homeSource.indexOf("{podium[2] && <PodiumCard"));
    expect(homeSource).toContain('className="order-2"');
    expect(homeSource).toContain('className="order-1 translate-y-3 sm:translate-y-5"');
    expect(homeSource).toContain('className="order-3 translate-y-5 sm:translate-y-9"');
    expect(homeSource).toContain('data-podium-motion={styles.motion}');
    expect(homeSource).toContain("data-testid=\"participant-profile-overlay\"");
    expect(homeSource).toContain("max-h-[min(92svh,46rem)] w-full max-w-xl flex-col overflow-hidden");
    expect(homeSource).toContain("createPortal(sheet, document.body)");
    expect(homeSource).toContain("Back to Overview");
    expect(homeSource).toContain('aria-label="Back to Overview list"');
    expect(homeSource).toContain('aria-label="Close participant details"');
    expect(homeSource).toContain("role=\"dialog\" aria-modal=\"true\"");
    expect(homeSource).toContain("min-[380px]:grid-cols-3");
    expect(homeSource).toContain("const [photoExpanded, setPhotoExpanded] = useState(false);");
    expect(homeSource).toContain("enlargeable onOpen={() => setPhotoExpanded(true)}");
    expect(homeSource).toContain("Close enlarged display picture");
  });

  it("documents swipe page transitions, the collapsible boost drawer, and rank-specific podium motion", () => {
    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");

    expect(homeSource).toContain('import { AnimatePresence, motion, useReducedMotion } from "framer-motion";');
    expect(homeSource).toContain("const pageSwipeVariants");
    expect(homeSource).toContain("const [transitionDirection, setTransitionDirection] = useState<SwipeDirection>(1);");
    expect(homeSource).toContain("touchStartXRef");
    expect(homeSource).toContain("const isHorizontalSwipe = isIntentionalPageSwipe(deltaX, deltaY, startedInExcludedContent);");
    expect(homeSource).toContain("PAGE_SWIPE_MIN_DISTANCE = 56");
    expect(homeSource).toContain('data-page-swipe-exclusion="true"');
    expect(homeSource).toContain('data-testid="swipe-page-stage"');
    expect(homeSource).toContain('data-swipe-transition="spring-slide-blur"');
    expect(homeSource).toContain('data-testid={`swipe-page-${activeTab}`}');
    expect(homeSource).toContain("<AnimatePresence mode=\"wait\" initial={false} custom={transitionDirection}>");
    expect(homeSource).toContain("const [boostKeyOpen, setBoostKeyOpen] = useState(false);");
    expect(homeSource).toContain('data-boost-collapsible-state={boostKeyOpen ? "open" : "closed"}');
    expect(homeSource).toContain("boostCollapseVariants");
    expect(homeSource).toContain('aria-controls="boost-key-collapsible-panel"');
    expect(homeSource).toContain('data-mobile-podium-layout="horizontal-stepped"');
    expect(homeSource).toContain('data-podium-motion={styles.motion}');
    expect(cssSource).toContain("@keyframes podium-gold-champion");
    expect(cssSource).toContain('[data-podium-motion="silver-lift"]');
    expect(cssSource).toContain('[data-podium-motion="bronze-rise"]');
  });

  it("treats page swipes as intentional only when the horizontal gesture is clear and not inside proof media", () => {
    expect(isIntentionalPageSwipe(57, 6)).toBe(true);
    expect(isIntentionalPageSwipe(55, 2)).toBe(false);
    expect(isIntentionalPageSwipe(90, 86)).toBe(false);
    expect(isIntentionalPageSwipe(140, 8, true)).toBe(false);
  });

  it("detects swipe-exclusion zones used by proof media and interactive controls", () => {
    const originalElement = globalThis.Element;
    class FakeElement {
      constructor(private readonly matched: boolean) {}
      closest() { return this.matched ? this : null; }
    }
    vi.stubGlobal("Element", FakeElement);

    expect(isPageSwipeExcludedTarget(new FakeElement(true) as unknown as EventTarget)).toBe(true);
    expect(isPageSwipeExcludedTarget(new FakeElement(false) as unknown as EventTarget)).toBe(false);

    if (originalElement) vi.stubGlobal("Element", originalElement);
    else vi.unstubAllGlobals();
  });

  it("generates Warden-style Board status lines while keeping analytical metrics for expanded rows", () => {
    const insights = buildParticipantInsights({
      currentDay: 7,
      now: new Date("2026-05-07T21:00:00"),
      participants: [
        { id: "critical", displayName: "Critical Casey", livesRemaining: 1, currentStreak: 0, totalPoints: 10 },
        { id: "runner", displayName: "Runner Riley", livesRemaining: 4, currentStreak: 3, totalPoints: 90 },
        { id: "proofless", displayName: "Proofless Pat", livesRemaining: 3, currentStreak: 0, totalPoints: 20 },
      ],
      logs: [
        { participantId: "runner", dayNumber: 7, completed: true, noAlcohol: true, cleanEating: true, exerciseDuration: 35, exerciseType: "run", reflectionText: "good effort today", readTeachText: "lesson learned today", trackedEverything: true, exerciseProofUrl: "/manus-storage/proof.webp", pointsAwarded: 15 },
        { participantId: "runner", dayNumber: 6, completed: true, noAlcohol: true, cleanEating: true, exerciseDuration: 35, exerciseType: "run", reflectionText: "good effort yesterday", readTeachText: "lesson learned yesterday", trackedEverything: true, exerciseProofUrl: "/manus-storage/proof-2.webp", pointsAwarded: 12 },
        { participantId: "proofless", dayNumber: 7, completed: false, noAlcohol: true, cleanEating: false, exerciseDuration: 0, exerciseType: "", reflectionText: "", readTeachText: "", trackedEverything: false, exerciseProofUrl: "", pointsAwarded: 0 },
      ],
    });

    expect(insights.find(item => item.id === "critical")?.statusLine).toBe("One life left. Needs a big day.");
    expect(insights.find(item => item.id === "runner")?.statusLine).toBe("Strong run — 3 days in a row.");
    expect(insights.find(item => item.id === "proofless")?.statusLine).toBe("Falling behind — no proof this week.");
    expect(insights[0].comparisonStats.map(stat => stat.label)).toEqual(["Pass pace", "Velocity", "Proof", "Risk"]);
  });

});
