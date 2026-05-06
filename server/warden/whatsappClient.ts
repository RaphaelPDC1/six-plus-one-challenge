/**
 * Whapi.Cloud WhatsApp message posting client
 * Sends Warden messages to the 6+1 WhatsApp group
 */

import { ENV } from "../_core/env";

export async function sendWardenMessage(text: string): Promise<void> {
  const token = ENV.whapiToken;
  const groupId = ENV.whapiGroupId;
  console.log('[Whapi Debug] Token:', token ? `${token.substring(0, 10)}...` : 'UNDEFINED');
  console.log('[Whapi Debug] Group ID:', groupId);
  
  const response = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: groupId,
      body: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whapi send failed: ${error}`);
  }
}
