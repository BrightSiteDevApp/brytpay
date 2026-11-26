# Outbound Webhook System

BRYT Pay sends signed HTTPS `POST` webhooks to notify partners in real time when payments settle, fail, or expire. Never trust client-side payment confirmations—always verify the webhook signature or call `GET /api/v1/payments/verify/{reference}` server-side.

## 1. Event Catalog

| Event Type | Trigger |
| :--- | :--- |
| `payment.successful` | Full expected bank transfer received and settled into partner balance |
| `payment.failed` | Payment failed or underpaid (`data.failure_reason: "UNDERPAYMENT"`) |
| `payment.expired` | Temporary bank account expired with no payment |
| `withdrawal.paid` | Admin marked a live manual settlement withdrawal as paid |
| `webhook.test` | Triggered manually via `POST /api/v1/webhooks/test` |

## 2. Webhook Headers

Every outbound delivery includes:
- `X-BRYT-Event-Id`: Globally unique event identifier (use for idempotency)
- `X-BRYT-Event-Type`: Event name (e.g., `payment.successful`)
- `X-BRYT-Timestamp`: Unix epoch seconds when signed
- `X-BRYT-Signature`: `v1=<hex_hmac_sha256>` (during 24-hour secret rotation: `v1=<new>,v1_prev=<old>`)
- `X-BRYT-Delivery-Id`: Unique delivery attempt group ID
- `X-BRYT-Environment`: `"test"` or `"live"`

## 3. Signature Verification (Supabase Edge Function / Deno Sample)

Verify **both** the timestamp (±5 minutes to prevent replay attacks) and the HMAC-SHA256 signature over the **raw request body**:

```typescript
const encoder = new TextEncoder();

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyBrytWebhook(req: Request, rawBody: string, webhookSecret: string): Promise<boolean> {
  const eventId = req.headers.get("x-bryt-event-id") || "";
  const ts = req.headers.get("x-bryt-timestamp") || "";
  const sigHeader = req.headers.get("x-bryt-signature") || "";

  // 1. Reject timestamps older/newer than 5 minutes
  const tsNum = Number(ts);
  if (!Number.isInteger(tsNum) || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > 300) {
    return false;
  }

  // 2. Compute expected HMAC-SHA256 over "{timestamp}.{event_id}.{rawBody}"
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}.${eventId}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, "0")).join("");

  // 3. Support both v1 and v1_prev during 24h secret rotation grace period
  const signatures = sigHeader.split(",").map((part) => part.trim().split("=")[1] || "");
  return signatures.some((sig) => safeEqual(sig, expected));
}