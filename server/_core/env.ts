export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  whapiToken: process.env.WHAPI_TOKEN ?? "",
  whapiGroupId: process.env.WHAPI_GROUP_ID ?? "",
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:owner@6plus1.local",
  // Injected by the Manus platform at deploy time; used to detect new deployments
  deployCommitHash: (process.env.LAST_COMMIT_HASH ?? "").slice(0, 12) || "dev",
};
