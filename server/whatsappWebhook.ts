import type { Express, Request, Response } from "express";
import { captureWhatsAppMessage } from "./db";

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          from?: string;
          timestamp?: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }>;
      };
    }>;
  }>;
};

function extractMessages(payload: WhatsAppWebhookPayload) {
  const messages: Array<{ senderId: string; senderName?: string; groupId: string; messageText: string; messageTimestamp: Date }> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const groupId = value?.metadata?.phone_number_id || "whatsapp-group";
      const contacts = new Map((value?.contacts ?? []).map(contact => [contact.wa_id, contact.profile?.name]));
      for (const message of value?.messages ?? []) {
        const messageText = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "[unsupported WhatsApp message]";
        const senderId = message.from || "unknown";
        const seconds = message.timestamp ? Number(message.timestamp) : NaN;
        messages.push({
          senderId,
          senderName: contacts.get(senderId),
          groupId,
          messageText,
          messageTimestamp: Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(),
        });
      }
    }
  }
  return messages;
}

export function registerWhatsAppWebhook(app: Express) {
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "six-plus-one-warden";

    if (mode === "subscribe" && token === expectedToken && typeof challenge === "string") {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ success: false, error: "Webhook verification failed" });
  });

  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    try {
      const messages = extractMessages(req.body as WhatsAppWebhookPayload);
      for (const message of messages) {
        await captureWhatsAppMessage(message);
      }
      return res.status(200).json({ success: true, captured: messages.length });
    } catch (error) {
      console.error("[WhatsApp Webhook] Failed to capture message", error);
      return res.status(500).json({ success: false, error: "Failed to capture WhatsApp message" });
    }
  });
}
