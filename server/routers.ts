import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveSignupRequest,
  captureWhatsAppMessage,
  createRedemption,
  completeOnboarding,
  createSignupRequest,
  getAppSnapshot,
  getCurrentChallengeDay,
  getOrCreateParticipant,
  getParticipantByUserId,
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

const signupRequestInput = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().max(120).optional().default("landing"),
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
        motivationStyle: z.enum(["direct", "supportive", "competitive", "quiet"]),
        profilePhotoDataUrl: z.string().max(3_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Profile photo must be a PNG, JPG, or WEBP data URL.").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await completeOnboarding(ctx.user, input);
        await logWardenMessage({ mode: "on_ramp", sourceEvent: "onboarding_complete", content: `${participant?.displayName ?? ctx.user.email ?? "A new participant"} completed the entry questionnaire and joined the 6+1 gate.` });
        return { success: true, participant } as const;
      }),

    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {
      const participant = await getOrCreateParticipant(ctx.user);
      const result = await submitDailyLog(participant.id, input);
      if (!result.complete) {
        await triggerLifeLoss(participant.id, `Missed rule(s): ${result.missedRules.join(", ")}`, result.log?.id ?? null);
      }
      return result;
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
