import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH_API_VERSION = 'v22.0';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

function getApiUrl(): string {
  const phoneNumberId = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
}

async function sendPayload(to: string, payload: Record<string, unknown>): Promise<void> {
  const token = requireEnv('WHATSAPP_TOKEN');
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      ...payload,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${body}`);
  }
}

export interface DownloadedMedia {
  data: Buffer;
  mimeType: string;
}

export async function downloadMedia(mediaId: string): Promise<DownloadedMedia> {
  const token = requireEnv('WHATSAPP_TOKEN');
  const metaResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!metaResponse.ok) {
    const body = await metaResponse.text();
    throw new Error(
      `WhatsApp media metadata error (${metaResponse.status}): ${body}`,
    );
  }

  const meta = (await metaResponse.json()) as {
    url?: string;
    mime_type?: string;
  };

  if (!meta.url) {
    throw new Error('WhatsApp media metadata missing download URL.');
  }

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    const body = await fileResponse.text();
    throw new Error(
      `WhatsApp media download error (${fileResponse.status}): ${body}`,
    );
  }

  const arrayBuffer = await fileResponse.arrayBuffer();

  return {
    data: Buffer.from(arrayBuffer),
    mimeType: meta.mime_type ?? 'audio/ogg',
  };
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  await sendPayload(to, {
    type: 'text',
    text: { body: text },
  });
}

export async function sendEventSummary(
  to: string,
  body: string,
  options: { showAddButton: boolean; addButtonTitle?: string },
): Promise<void> {
  if (!options.showAddButton) {
    await sendTextMessage(to, body);
    return;
  }

  await sendPayload(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'add_event',
              title: options.addButtonTitle ?? 'Add to calendar',
            },
          },
        ],
      },
    },
  });
}

export function verifyWebhookChallenge(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
): string | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return null;
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return challenge;
  }

  return null;
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return true;
  }

  if (!signatureHeader?.startsWith('sha256=')) {
    return false;
  }

  const expected = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const received = signatureHeader.slice('sha256='.length);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
