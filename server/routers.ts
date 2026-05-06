import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveSignupRequest,
  captureWhatsAppMessage,
  createSiteNativeUser,
  createRedemption,
  completeOnboarding,
  createSignupRequest,
  getAppSnapshot,
  getCurrentChallengeDay,
  getOrCreateParticipant,
  getParticipantByUserId,
  normalizeSignupEmail,
  logWardenMessage,
  markPaymentReceived,
  markRedemptionFulfilled,
  rejectSignupRequest,
  submitDailyLog,
  triggerLifeLoss,
  tryApplyGhostLife,
  updateParticipantProfile,
} from "./db";
import { generateWardenCommentary } from "./warden";
import { storagePut } from "./storage";

const signupRequestInput = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().max(120).optional().default("landing"),
});

const personalizationInput = z.object({
  primaryGoal: z.string().trim().min(3).max(220),
  biggestObstacle: z.string().trim().min(3).max(2000),
  trainingLevel: z.enum(["starting", "building", "consistent", "advanced"]),
  motivationStyle: z.string().max(80).optional().default("adaptive"),
  supportNeeded: z.string().trim().min(3).max(2000),
});

const siteLoginInput = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(2).max(140).optional(),
  mode: z.enum(["register", "login"]).default("register"),
  profilePhotoDataUrl: z.string().max(2_800_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Profile photo must be a PNG, JPG, or WEBP image.").optional(),
  personalization: personalizationInput.optional(),
});

const dayLogInput = z.object({
  dayNumber: z.number().int().min(1).max(50).default(getCurrentChallengeDay()),
  noAlcohol: z.boolean(),
  cleanEating: z.boolean(),
  cleanEatingNote: z.string().max(1000).optional().default(""),
  exerciseDuration: z.number().int().min(0).max(600),
  exerciseType: z.string().max(140).default(""),
  exerciseProofUrl: z.string().max(2000).default(""),
  reflectionText: z.string().max(4000).default(""),
  reflectionShared: z.boolean().default(false),
  readTeachText: z.string().max(4000).default(""),
  trackedEverything: z.boolean().default(false),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logoUrl: publicProcedure.query(async () => {
      return { url: "/manus-storage/six-plus-one-logo-inverted-gold_e742b8d3.webp" };
    }),
    siteLogin: publicProcedure.input(siteLoginInput).mutation(async ({ ctx, input }) => {
      const email = normalizeSignupEmail(input.email);
      if (input.mode === "register" && !input.personalization) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Answer the five registration questions before joining the challenge." });
      }
      const user = await createSiteNativeUser({
        email,
        displayName: input.displayName || email,
        mode: input.mode,
        profilePhotoDataUrl: input.mode === "register" ? input.profilePhotoDataUrl : undefined,
        personalization: input.mode === "register" ? input.personalization : undefined,
      });
      const token = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "6+1 participant" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { success: true, mode: input.mode, user } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  signup: router({
    requestAccess: publicProcedure.input(signupRequestInput).mutation(async ({ input }) => {
      const request = await createSignupRequest(input.email, input.source);
      return { success: true, request } as const;
    }),
  }),

  challenge: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      return getAppSnapshot(ctx.user.id, ctx.user.role, ctx.user.email);
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(140),
        whatsappName: z.string().max(140).optional().default(""),
        monzoPaymentLink: z.string().max(2000).optional().default(""),
        primaryGoal: z.string().max(220).optional().default(""),
        biggestObstacle: z.string().max(2000).optional().default(""),
        trainingLevel: z.string().max(80).optional().default(""),
        motivationStyle: z.string().max(80).optional().default(""),
        supportNeeded: z.string().max(2000).optional().default(""),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateParticipantProfile(ctx.user.id, input);
      }),

    completeOnboarding: protectedProcedure
      .input(z.object({
        displayName: z.string().trim().min(2).max(140),
        primaryGoal: z.string().trim().min(3).max(220),
        biggestObstacle: z.string().trim().min(3).max(2000),
        trainingLevel: z.enum(["starting", "building", "consistent", "advanced"]),
        motivationStyle: z.string().max(80).optional().default("adaptive"),
        supportNeeded: z.string().trim().min(3).max(2000).optional(),
        profilePhotoDataUrl: z.string().max(3_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Profile photo must be a PNG, JPG, or WEBP data URL.").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await completeOnboarding(ctx.user, input);
        await logWardenMessage({ mode: "on_ramp", sourceEvent: "onboarding_complete", content: `${participant?.displayName ?? ctx.user.email ?? "A new participant"} completed the entry questionnaire and joined the 6+1 gate.` });
        return { success: true, participant } as const;
      }),

    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {
      const participant = await getOrCreateParticipant(ctx.user);
      return submitDailyLog(participant.id, input);
    }),

    uploadProof: protectedProcedure
      .input(z.object({
        fileName: z.string().trim().min(1).max(180),
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        dataUrl: z.string().max(6_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Proof image must be a PNG, JPG, or WEBP data URL."),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getOrCreateParticipant(ctx.user);
        const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const base64 = input.dataUrl.split(",")[1] ?? "";
        const bytes = Buffer.from(base64, "base64");
        if (bytes.length === 0 || bytes.length > 4_000_000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Proof image must be under 4MB." });
        }
        const safeName = input.fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 80) || "exercise-proof";
        const stored = await storagePut(`exercise-proof/participant-${participant.id}/${Date.now()}-${safeName}.${extension}`, bytes, input.mimeType);
        return { success: true, url: stored.url, key: stored.key } as const;
      }),

    loseLife: protectedProcedure
      .input(z.object({ reason: z.string().min(2).max(500), dailyLogId: z.number().int().optional() }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        return triggerLifeLoss(participant.id, input.reason, input.dailyLogId ?? null);
      }),

    applyGhostLife: protectedProcedure
      .input(z.object({ exerciseDuration: z.number().int().min(0).max(600), insightCount: z.number().int().min(0).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        return tryApplyGhostLife(participant.id, input.exerciseDuration, input.insightCount);
      }),

    redeemReward: protectedProcedure
      .input(z.object({
        rewardId: z.number().int(),
        deliveryName: z.string().min(2).max(180),
        deliveryAddress: z.string().min(8).max(2000),
        checkpointEarned: z.string().min(2).max(80),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        await createRedemption(participant.id, input);
        await logWardenMessage({ mode: "commentary", sourceEvent: "reward_redeemed", content: `${participant.displayName} has requested a Pure Sport reward. The earn side is now visible.` });
        return { success: true } as const;
      }),
  }),

  admin: router({
    confirmPayment: adminProcedure.input(z.object({ paymentId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await markPaymentReceived(input.paymentId, ctx.user.id);
      return { success: true } as const;
    }),

    fulfillRedemption: adminProcedure.input(z.object({ redemptionId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await markRedemptionFulfilled(input.redemptionId, ctx.user.id);
      return { success: true } as const;
    }),

    approveSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await approveSignupRequest(input.requestId, ctx.user.id);
      return { success: true } as const;
    }),

    rejectSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await rejectSignupRequest(input.requestId, ctx.user.id);
      return { success: true } as const;
    }),

    logWardenMessage: adminProcedure
      .input(z.object({
        mode: z.enum(["surveillance", "commentary", "on_ramp", "system"]),
        content: z.string().min(2).max(4000),
        sourceEvent: z.string().max(140).optional(),
        postedToWhatsapp: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => logWardenMessage(input)),

    runWarden: adminProcedure
      .input(z.object({ mode: z.enum(["surveillance", "commentary", "on_ramp"]) }))
      .mutation(async ({ ctx, input }) => generateWardenCommentary(ctx.user.id, input.mode)),
  }),

  whatsapp: router({
    captureMessage: publicProcedure
      .input(z.object({
        senderId: z.string().min(1).max(180),
        senderName: z.string().max(180).optional(),
        groupId: z.string().min(1).max(180),
        messageText: z.string().min(1).max(4000),
        messageTimestamp: z.coerce.date().optional(),
      }))
      .mutation(async ({ input }) => {
        await captureWhatsAppMessage(input);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
