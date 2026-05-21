import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addProofComment,
  approveSignupRequest,
  awardBoostWin,
  calculateAndAwardBoostsForDay,
  acknowledgeReleaseNoteForUser,
  captureWhatsAppMessage,
  createCommunityCareReleaseNote,
  createSiteNativeUser,
  createRedemption,
  completeOnboarding,
  createSignupRequest,
  getAppSnapshot,
  getBoostWinsForChallenge,
  getBoostWinsForParticipant,
  getCurrentChallengeDay,
  getOrCreateParticipant,
  getParticipantByUserId,
  getParticipantHistory,
  getLatestUnacknowledgedReleaseNote,
  normalizeSignupEmail,
  logWardenMessage,
  markPaymentReceived,
  markRedemptionFulfilled,
  rejectSignupRequest,
  recordNayBackdatedTechnicalProof,
  submitDailyLog,
  toggleProofReaction,
  triggerLifeLoss,
  tryApplyGhostLife,
  updateParticipantProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  upsertPushSubscription,
  disablePushSubscription,
  listUserNotifications,
  markUserNotificationsRead,
  logAdminAction,
  getAdminAuditLog,
} from "./db";
import { generateWardenCommentary } from "./warden";
import { generateDeepThoughtsForSnapshot } from "./deepThought";
import { generateReleaseNoteInsight } from "./releaseNoteGenerator";
import { wardenRouter } from "./warden/wardenRouters";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { getPushConfig, hashPushEndpoint, notifyUserWithPush } from "./pushNotifications";
import { BOOST_CHALLENGE_ID, BOOST_POINTS, ALL_BOOSTS, getActiveBoostsForDay } from "../shared/boostSystem";

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
  exerciseProofUrl: z.string().max(12000).default(""),
  reflectionText: z.string().max(4000).default(""),
  reflectionShared: z.boolean().default(false),
  readTeachText: z.string().max(4000).default(""),
  trackedEverything: z.boolean().default(false),
});

const pushSubscriptionInput = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(256),
  }),
});

const notificationPreferenceInput = z.object({
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  morningIntent: z.boolean().optional(),
  afternoonProof: z.boolean().optional(),
  eveningDeadline: z.boolean().optional(),
  lifeRisk: z.boolean().optional(),
  streakRewards: z.boolean().optional(),
  wardenUpdates: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).optional(),
  timezone: z.string().min(2).max(80).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logoUrl: publicProcedure.query(async () => {
      return { url: "/manus-storage/six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp" };
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

    deepThoughts: protectedProcedure
      .input(z.object({ logIds: z.array(z.number().int()).max(12).optional().default([]) }).optional())
      .query(async ({ ctx, input }) => {
        const snapshot = await getAppSnapshot(ctx.user.id, ctx.user.role, ctx.user.email);
        return generateDeepThoughtsForSnapshot(snapshot, input?.logIds ?? []);
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
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "video/quicktime"]),
        // base64 overhead is ~4/3 of raw bytes; 50MB video → ~67M chars, 10MB image → ~14M chars
        dataUrl: z.string().max(70_000_000).regex(/^data:(image\/(png|jpeg|webp)|video\/(mp4|webm|quicktime));base64,[A-Za-z0-9+/=]+$/, "Proof media must be a PNG, JPG, WEBP, MP4, MOV, or WEBM data URL."),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getOrCreateParticipant(ctx.user);
        const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : input.mimeType === "video/mp4" ? "mp4" : input.mimeType === "video/webm" ? "webm" : input.mimeType === "video/quicktime" ? "mov" : "jpg";
        const base64 = input.dataUrl.split(",")[1] ?? "";
        const bytes = Buffer.from(base64, "base64");
        const sizeLimit = input.mimeType.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (bytes.length === 0 || bytes.length > sizeLimit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: input.mimeType.startsWith("video/") ? "Proof video must be under 50MB." : "Proof image must be under 10MB." });
        }
        const safeName = input.fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 80) || "exercise-proof";
        const stored = await storagePut(`exercise-proof/participant-${participant.id}/${Date.now()}-${safeName}.${extension}`, bytes, input.mimeType);
        return { success: true, url: stored.url, key: stored.key, mediaType: input.mimeType.startsWith("video/") ? "video" as const : "image" as const, mimeType: input.mimeType, fileName: safeName } as const;
      }),

    submitNayBackdatedTechnicalProof: protectedProcedure
      .input(z.object({
        dayNumber: z.number().int().min(1).max(50).default(2),
        proofMedia: z.string().trim().min(2).max(12000),
        note: z.string().trim().max(1000).optional().default("Backdated proof accepted after the Day 2 upload technical issue."),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        try {
          return await recordNayBackdatedTechnicalProof(participant.id, input);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not save the backdated proof." });
        }
      }),

    reactToProof: protectedProcedure
      .input(z.object({
        dailyLogId: z.number().int().positive(),
        reaction: z.enum(["fire", "strong", "inspired", "accountable"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        try {
          return await toggleProofReaction(participant.id, input);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not save reaction." });
        }
      }),

    commentOnProof: protectedProcedure
      .input(z.object({
        dailyLogId: z.number().int().positive(),
        comment: z.string().trim().min(2).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        try {
          return await addProofComment(participant.id, input);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not save comment." });
        }
      }),

    participantHistory: protectedProcedure
      .input(z.object({ participantId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const viewer = await getParticipantByUserId(ctx.user.id);
        return getParticipantHistory(input.participantId, viewer?.id ?? null);
      }),

    latestReleaseNote: protectedProcedure
      .query(({ ctx }) => getLatestUnacknowledgedReleaseNote(ctx.user.id)),

    acknowledgeReleaseNote: protectedProcedure
      .input(z.object({ releaseNoteId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => acknowledgeReleaseNoteForUser(input.releaseNoteId, ctx.user.id)),

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
        deliveryName: z.string().min(2).max(180).optional(),
        deliveryAddress: z.string().min(2).max(2000).optional(),
        checkpointEarned: z.string().min(2).max(80).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant profile not found" });
        const redemption = await createRedemption(participant.id, {
          rewardId: input.rewardId,
          deliveryName: input.deliveryName?.trim() || participant.displayName || ctx.user.name || ctx.user.email || "6+1 participant",
          deliveryAddress: input.deliveryAddress?.trim() || "Tap-to-redeem request — admin to confirm fulfilment details directly with participant.",
          checkpointEarned: input.checkpointEarned?.trim() || `${participant.totalPoints ?? 0} points`,
        });
        await logWardenMessage({ mode: "commentary", sourceEvent: "reward_redeemed", content: `${participant.displayName} requested ${redemption.reward.name}. Admin fulfilment is now pending.` });
        try {
          await notifyOwner({
            title: "6+1 reward redemption request",
            content: `${participant.displayName} tapped to redeem ${redemption.reward.name} (${redemption.reward.pointsCost} points). Current points: ${participant.totalPoints ?? 0}. Please contact them to confirm fulfilment details.`,
          });
        } catch (error) {
          console.warn("[Rewards] Owner notification failed", error);
        }
        return { success: true, reward: redemption.reward } as const;
      }),
  }),

  notifications: router({
    pushConfig: protectedProcedure.query(() => getPushConfig()),

    preferences: protectedProcedure.query(({ ctx }) => getNotificationPreferences(ctx.user.id)),

    updatePreferences: protectedProcedure
      .input(notificationPreferenceInput)
      .mutation(({ ctx, input }) => updateNotificationPreferences(ctx.user.id, input)),

    registerPush: protectedProcedure
      .input(pushSubscriptionInput)
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        const endpointHash = hashPushEndpoint(input.endpoint);
        const subscription = await upsertPushSubscription({
          userId: ctx.user.id,
          participantId: participant?.id ?? null,
          endpoint: input.endpoint,
          endpointHash,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        });
        return { success: true, endpointHash, subscriptionId: subscription?.id ?? null } as const;
      }),

    unregisterPush: protectedProcedure
      .input(z.object({ endpoint: z.string().url().max(4096) }))
      .mutation(({ ctx, input }) => disablePushSubscription(ctx.user.id, hashPushEndpoint(input.endpoint))),

    list: protectedProcedure.query(({ ctx }) => listUserNotifications(ctx.user.id)),

    markRead: protectedProcedure
      .input(z.object({ notificationIds: z.array(z.number().int().positive()).max(100).optional() }).optional())
      .mutation(({ ctx, input }) => markUserNotificationsRead(ctx.user.id, input?.notificationIds)),

    sendTest: protectedProcedure.mutation(async ({ ctx }) => {
      const participant = await getParticipantByUserId(ctx.user.id);
      return notifyUserWithPush({
        userId: ctx.user.id,
        participantId: participant?.id ?? null,
        type: "system",
        title: "6+1 notifications are ready",
        body: "This is a test push from your installed 6+1 challenge app.",
        actionUrl: "/",
      });
    }),
  }),

  boost: router({
    active: protectedProcedure
      .input(z.object({ day: z.number().int().min(1).max(50).optional() }).optional())
      .query(({ input }) => ({ day: input?.day ?? getCurrentChallengeDay(), activeBoosts: getActiveBoostsForDay(input?.day ?? getCurrentChallengeDay()), allBoosts: ALL_BOOSTS })),

    getWins: protectedProcedure
      .input(z.object({ participantId: z.number().int().optional(), challengeId: z.number().int().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const challengeId = input?.challengeId ?? BOOST_CHALLENGE_ID;
        const participant = await getParticipantByUserId(ctx.user.id);
        const participantId = input?.participantId ?? participant?.id;
        if (!participantId) return [];
        if (ctx.user.role !== "admin" && (!participant || String(participant.id) !== String(participantId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own boost wins." });
        }
        return getBoostWinsForParticipant(challengeId, participantId);
      }),

    getChallengeWins: protectedProcedure
      .input(z.object({ challengeId: z.number().int().optional() }).optional())
      .query(async ({ input }) => getBoostWinsForChallenge(input?.challengeId ?? BOOST_CHALLENGE_ID)),

    award: adminProcedure
      .input(z.object({
        userId: z.number().int(),
        day: z.number().int().min(1).max(50).default(getCurrentChallengeDay()),
        boostId: z.string().min(1).max(64),
        boostName: z.string().min(1).max(140),
        boostIcon: z.string().min(1).max(10).default("+"),
        pointsAwarded: z.number().int().min(1).max(25).default(BOOST_POINTS),
        wardenNote: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => awardBoostWin({ challengeId: BOOST_CHALLENGE_ID, ...input, wardenNote: input.wardenNote ?? null })),

    calculateDay: adminProcedure
      .input(z.object({ day: z.number().int().min(1).max(50).default(getCurrentChallengeDay()) }))
      .mutation(async ({ input }) => calculateAndAwardBoostsForDay(input.day)),
  }),

  admin: router({
    confirmPayment: adminProcedure.input(z.object({ paymentId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await markPaymentReceived(input.paymentId, ctx.user.id);
      await logAdminAction({ adminUserId: ctx.user.id, adminName: ctx.user.name ?? "Admin", action: "mark_payment_received", newValue: `paymentId:${input.paymentId}` });
      return { success: true } as const;
    }),

    fulfillRedemption: adminProcedure.input(z.object({ redemptionId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await markRedemptionFulfilled(input.redemptionId, ctx.user.id);
      await logAdminAction({ adminUserId: ctx.user.id, adminName: ctx.user.name ?? "Admin", action: "fulfill_reward", newValue: `redemptionId:${input.redemptionId}` });
      return { success: true } as const;
    }),

    approveSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await approveSignupRequest(input.requestId, ctx.user.id);
      await logAdminAction({ adminUserId: ctx.user.id, adminName: ctx.user.name ?? "Admin", action: "approve_signup", newValue: `requestId:${input.requestId}` });
      return { success: true } as const;
    }),

    rejectSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {
      await rejectSignupRequest(input.requestId, ctx.user.id);
      await logAdminAction({ adminUserId: ctx.user.id, adminName: ctx.user.name ?? "Admin", action: "reject_signup", newValue: `requestId:${input.requestId}` });
      return { success: true } as const;
    }),

    auditLog: adminProcedure.query(async () => {
      return getAdminAuditLog(100);
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

    createReleaseNote: adminProcedure
      .input(z.object({
        title: z.string().trim().min(3).max(180),
        summary: z.string().trim().min(3).max(1000),
        body: z.string().trim().min(3).max(4000),
        versionLabel: z.string().trim().min(1).max(80),
        category: z.enum(["edit", "community_care", "rules", "rewards", "technical"]).default("edit"),
        active: z.boolean().default(true),
      }))
      .mutation(({ ctx, input }) => createCommunityCareReleaseNote(input, ctx.user.id)),
    generateCommunityInsight: adminProcedure
      .mutation(async ({ ctx }) => {
        const snapshot = await getAppSnapshot(ctx.user.id, ctx.user.role, ctx.user.email);
        const recentLogs = snapshot.logs
          .filter((log: any) => log.dayComplete)
          .slice(0, 21)
          .map((log: any) => ({
            dayNumber: log.dayNumber,
            exerciseType: log.exerciseType ?? undefined,
            exerciseDuration: log.exerciseDuration ?? undefined,
            reflectionText: log.reflectionText ?? undefined,
            readTeachText: log.readTeachText ?? undefined,
            cleanEatingNote: log.cleanEatingNote ?? undefined,
            pointsAwarded: log.pointsAwarded,
          }));
        const totalPts = snapshot.participants.reduce((sum: number, p: any) => sum + p.totalPoints, 0);
        const avgPts = snapshot.participants.length > 0 ? Math.round(totalPts / snapshot.participants.length) : 0;
        const avgStreak = snapshot.participants.length > 0
          ? Math.round(snapshot.participants.reduce((sum: number, p: any) => sum + p.currentStreak, 0) / snapshot.participants.length)
          : 0;
        return generateReleaseNoteInsight(
          ctx.user.name ?? ctx.user.email ?? "Challenger",
          recentLogs,
          { avgPointsPerDay: avgPts, avgStreakLength: avgStreak, totalParticipants: snapshot.participants.length },
        );
      }),
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

  warden: wardenRouter,

  debug: router({
    reportBug: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(3).max(180),
        description: z.string().trim().min(3).max(4000),
        affectedPage: z.string().max(80).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        screenshotUrl: z.string().url().max(2000).optional(),
        screenshotKey: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getParticipantByUserId(ctx.user.id);
        const { createBugReport } = await import("./logging");
        const result = await createBugReport({
          userId: ctx.user.id,
          participantId: participant?.id,
          title: input.title,
          description: input.description,
          affectedPage: input.affectedPage,
          priority: input.priority,
          screenshotUrl: input.screenshotUrl,
          screenshotKey: input.screenshotKey,
        });
        await logWardenMessage({
          mode: "system",
          sourceEvent: "bug_report",
          content: `Bug report from ${participant?.displayName || ctx.user.email}: "${input.title}" (Priority: ${input.priority})`,
        });
        try {
          await notifyOwner({
            title: "Bug Report: " + input.title,
            content: `From ${participant?.displayName || ctx.user.email}\n\nPage: ${input.affectedPage || "unknown"}\nPriority: ${input.priority}\n\n${input.description}`,
          });
        } catch (error) {
          console.warn("[BugReport] Owner notification failed", error);
        }
        return { success: true, bugReportId: Math.random() } as const;
      }),

    forceRefresh: protectedProcedure.mutation(async ({ ctx }) => {
      const participant = await getParticipantByUserId(ctx.user.id);
      const { logSync } = await import("./logging");
      await logSync({
        userId: ctx.user.id,
        participantId: participant?.id,
        action: "forceRefresh",
        issue: "User manually triggered refresh",
      });
      return getAppSnapshot(ctx.user.id, ctx.user.role, ctx.user.email);
    }),
  }),
});

export type AppRouter = typeof appRouter;
export type WardenRouter = typeof wardenRouter;
