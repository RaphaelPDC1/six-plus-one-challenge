import fs from 'node:fs';

const path = '/home/ubuntu/six-plus-one-challenge/server/routers.ts';
let text = fs.readFileSync(path, 'utf8');
function replaceOnce(find, replace) {
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`Expected one occurrence, found ${count}: ${find.slice(0, 80)}`);
  text = text.replace(find, replace);
}

replaceOnce(`  approveSignupRequest,\n  captureWhatsAppMessage,\n  createSiteNativeUser,`, `  approveSignupRequest,\n  awardBoostWin,\n  calculateAndAwardBoostsForDay,\n  captureWhatsAppMessage,\n  createSiteNativeUser,`);
replaceOnce(`  getAppSnapshot,\n  getCurrentChallengeDay,`, `  getAppSnapshot,\n  getBoostWinsForChallenge,\n  getBoostWinsForParticipant,\n  getCurrentChallengeDay,`);
replaceOnce(`import { notifyOwner } from "./_core/notification";\n`, `import { notifyOwner } from "./_core/notification";\nimport { BOOST_CHALLENGE_ID, BOOST_POINTS, BOOST_SEQUENCE, getActiveBoostsForDay } from "../shared/boostSystem";\n`);

replaceOnce(`\n  admin: router({\n`, `\n  boost: router({\n    active: protectedProcedure\n      .input(z.object({ day: z.number().int().min(1).max(50).optional() }).optional())\n      .query(({ input }) => ({ day: input?.day ?? getCurrentChallengeDay(), activeBoosts: getActiveBoostsForDay(input?.day ?? getCurrentChallengeDay()), allBoosts: BOOST_SEQUENCE })),\n\n    getWins: protectedProcedure\n      .input(z.object({ participantId: z.number().int().optional(), challengeId: z.number().int().optional() }).optional())\n      .query(async ({ ctx, input }) => {\n        const challengeId = input?.challengeId ?? BOOST_CHALLENGE_ID;\n        const participant = await getParticipantByUserId(ctx.user.id);\n        const participantId = input?.participantId ?? participant?.id;\n        if (!participantId) return [];\n        if (ctx.user.role !== "admin" && (!participant || String(participant.id) !== String(participantId))) {\n          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own boost wins." });\n        }\n        return getBoostWinsForParticipant(challengeId, participantId);\n      }),\n\n    getChallengeWins: protectedProcedure\n      .input(z.object({ challengeId: z.number().int().optional() }).optional())\n      .query(async ({ input }) => getBoostWinsForChallenge(input?.challengeId ?? BOOST_CHALLENGE_ID)),\n\n    award: adminProcedure\n      .input(z.object({\n        userId: z.number().int(),\n        day: z.number().int().min(1).max(50).default(getCurrentChallengeDay()),\n        boostId: z.string().min(1).max(64),\n        boostName: z.string().min(1).max(140),\n        boostIcon: z.string().min(1).max(10).default("+"),\n        pointsAwarded: z.number().int().min(1).max(25).default(BOOST_POINTS),\n        wardenNote: z.string().max(1000).optional(),\n      }))\n      .mutation(async ({ input }) => awardBoostWin({ challengeId: BOOST_CHALLENGE_ID, ...input, wardenNote: input.wardenNote ?? null })),\n\n    calculateDay: adminProcedure\n      .input(z.object({ day: z.number().int().min(1).max(50).default(getCurrentChallengeDay()) }))\n      .mutation(async ({ input }) => calculateAndAwardBoostsForDay(input.day)),\n  }),\n\n  admin: router({\n`);

fs.writeFileSync(path, text);
