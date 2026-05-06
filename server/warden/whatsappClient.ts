/**
 * Whapi.Cloud WhatsApp message posting client
 * Sends Warden messages to the 6+1 WhatsApp group
 */

export async function sendWardenMessage(text: string): Promise<void> {
  const response = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: process.env.WHAPI_GROUP_ID,
      body: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whapi send failed: ${error}`);
  }
}
