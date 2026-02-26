#!/usr/bin/env node

/**
 * Quick helper to simulate Omise charge webhooks in local/test environments.
 *
 * Usage examples:
 *   pnpm simulate:omise-webhook --charge-id=chrg_test_xxx --webhook-url=https://abcd.ngrok.app/api/omise-webhook
 *   pnpm simulate:omise-webhook --charge-id=chrg_test_xxx --status=failed
 *
 * The script reads configuration from `.env.local` or `.env` automatically via dotenv.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_CANDIDATES = [".env.local", ".env"];
for (const filename of ENV_CANDIDATES) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

typeAbortOnUnhandledRejection();

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help || options.h) {
  printUsage();
  process.exit(0);
}

const chargeId =
  options["charge-id"] ||
  options.charge ||
  options.chargeId ||
  process.env.CHARGE_ID;
const secret = options.secret || process.env.OMISE_WEBHOOK_SECRET;
const webhookUrl =
  options["webhook-url"] ||
  options.webhook ||
  process.env.OMISE_WEBHOOK_URL ||
  process.env.WEBHOOK_URL;
const status =
  options.status || process.env.OMISE_WEBHOOK_STATUS || "successful";
const eventKey =
  options.event || process.env.OMISE_WEBHOOK_EVENT || "charge.complete";
const timeoutMs = Number(
  options.timeout || process.env.WEBHOOK_REQUEST_TIMEOUT_MS || 10000
);

if (!secret) {
  console.error(
    "[error] Missing Omise webhook secret. Provide --secret or set OMISE_WEBHOOK_SECRET in .env.local"
  );
  process.exit(1);
}

if (!webhookUrl) {
  console.error(
    "[error] Missing webhook URL. Provide --webhook-url or set WEBHOOK_URL (or OMISE_WEBHOOK_URL) in .env.local"
  );
  process.exit(1);
}

if (!chargeId) {
  console.error(
    "[error] Missing charge id. Provide --charge-id or set CHARGE_ID in .env.local"
  );
  process.exit(1);
}

try {
  new URL(webhookUrl);
} catch {
  console.error(`[error] Invalid webhook URL: ${webhookUrl}`);
  process.exit(1);
}

const payload = {
  key: eventKey,
  data: {
    object: "charge",
    id: chargeId,
    status,
    metadata: {
      simulated: true,
      trigger: "simulate-omise-webhook",
      ...(options.note ? { note: options.note } : {}),
    },
    simulated_at: new Date().toISOString(),
  },
};

const signature = crypto
  .createHmac("sha256", secret)
  .update(JSON.stringify(payload))
  .digest("hex");

(async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-omise-signature": signature,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[error] ${response.status} ${response.statusText}: ${text}`
      );
      process.exit(1);
    }

    console.log(`[success] Webhook acknowledged (${response.status}).`);
    if (text) {
      console.log(text);
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      console.error(`[error] Request timed out after ${timeoutMs}ms`);
    } else {
      console.error(
        "[error] Webhook simulation failed:",
        error.message || error
      );
    }
    process.exit(1);
  }
})();

function parseArgs(rawArgs) {
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const eqIndex = arg.indexOf("=");
    if (eqIndex !== -1) {
      const key = arg.slice(2, eqIndex);
      const value = arg.slice(eqIndex + 1);
      parsed[key] = value;
      continue;
    }

    const key = arg.slice(2);
    const next = rawArgs[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function printUsage() {
  console.log(`
Usage: pnpm simulate:omise-webhook [options]

Options:
  --charge-id <id>       Charge id to reference (defaults to CHARGE_ID env)
  --webhook-url <url>    Target webhook endpoint (defaults to WEBHOOK_URL env)
  --secret <secret>      Omise webhook signing secret (defaults to OMISE_WEBHOOK_SECRET env)
  --status <status>      Charge status to broadcast (default: successful)
  --event <key>          Omise event key (default: charge.complete)
  --note <text>          Optional metadata note stored with the event
  --timeout <ms>         Request timeout in milliseconds (default: 10000)
  --help                 Show this message

Examples:
  pnpm simulate:omise-webhook --charge-id=chrg_test_xxx \
    --webhook-url=https://abcd.ngrok-free.app/api/omise-webhook
  pnpm simulate:omise-webhook --charge-id=chrg_test_xxx --status=failed
`);
}

function typeAbortOnUnhandledRejection() {
  process.on("unhandledRejection", reason => {
    console.error("[error] Unhandled rejection:", reason);
    process.exit(1);
  });
}
