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

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockState.auth,
}));

vi.mock("@/const", () => ({
  getLoginUrl: () => "/login",
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
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

    expect(markup).toContain("/manus-storage/six-plus-one-brand-logo-visible_52856d30.webp");
    expect(markup).toContain("alt=\"6+1 Four Lives Challenge logo\"");
    expect(markup).toContain("data-testid=\"brand-logo\"");
    expect(markup).not.toContain(">6+1</");
  });

  it("renders the real authenticated top header with the uploaded logo in the top corner", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("sticky top-0");
    expect(markup).toContain("/manus-storage/six-plus-one-brand-logo-visible_52856d30.webp");
    expect(markup).toContain("data-testid=\"brand-logo\"");
    expect(markup).toContain("Four Lives Challenge");
  });

  it("renders the real unknown-email questionnaire gate from mocked app state", () => {
    mockState.snapshotQuery.data = { accessState: { status: "questionnaire_required" } };
    mockState.snapshotQuery.isLoading = false;

    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Unknown email");
    expect(markup).toContain("Personalise the challenge first");
    expect(markup).toContain("new@example.com");
    expect(markup).toContain("/manus-storage/six-plus-one-brand-logo-visible_52856d30.webp");
  });
});
