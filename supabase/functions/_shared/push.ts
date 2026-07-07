// Web push sender shared by scheduled/notification functions.
// VAPID keys come from function secrets; expired subscriptions are pruned.
import webpush from "npm:web-push@3.6.7";

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Sends one payload to every subscription. Subscriptions the push service
 * reports gone (404/410) are deleted so dead endpoints don't accumulate.
 */
export async function sendPush(
  // deno-lint-ignore no-explicit-any
  adminClient: any,
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number; errors: number }> {
  if (!ensureConfigured() || subscriptions.length === 0) {
    return { sent: 0, removed: 0, errors: 0 };
  }

  let sent = 0;
  let errors = 0;
  const gone: string[] = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        gone.push(sub.id);
      } else {
        errors++;
      }
    }
  }));

  if (gone.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("id", gone);
  }
  return { sent, removed: gone.length, errors };
}
