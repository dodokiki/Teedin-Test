#!/usr/bin/env node

/**
 * Script สำหรับตรวจสอบว่า Environment Variables สำหรับ Omise ครบถ้วนหรือไม่
 * Usage: node scripts/check-omise-env.js [--production]
 */

const fs = require("fs");
const path = require("path");

const isProduction = process.argv.includes("--production");
const envFile = isProduction ? ".env.production" : ".env.local";

console.log(
  `\n🔍 Checking Omise Environment Variables (${isProduction ? "Production" : "Development"})...\n`
);

// Required environment variables
const requiredVars = {
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: {
    description: "Omise Public Key",
    pattern: isProduction ? /^pk(live|ey_live)_/ : /^pk(ey_)?test_/,
    errorMessage: isProduction
      ? "Production key should start with pk_live_ or pkey_live_"
      : "Test key should start with pk_test_ or pkey_test_",
  },
  OMISE_SECRET_KEY: {
    description: "Omise Secret Key",
    pattern: isProduction ? /^sk(live|ey_live)_/ : /^sk(ey_)?test_/,
    errorMessage: isProduction
      ? "Production key should start with sk_live_ or skey_live_"
      : "Test key should start with sk_test_ or skey_test_",
  },
  OMISE_WEBHOOK_SECRET: {
    description: "Omise Webhook Secret",
    pattern: /^whsec_/,
    errorMessage: "Webhook secret should start with whsec_",
  },
  NEXT_PUBLIC_CONTACT_REVEAL_PRICE: {
    description: "Contact Reveal Price (THB)",
    pattern: /^\d+$/,
    errorMessage: "Price should be a number",
    optional: true,
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    description: "Supabase URL",
    pattern: /^https?:\/\//,
    errorMessage: "Should be a valid URL",
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    description: "Supabase Anon Key",
    pattern: /^eyJ/,
    errorMessage: "Should be a valid JWT token",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: "Supabase Service Role Key",
    pattern: /^eyJ/,
    errorMessage: "Should be a valid JWT token",
  },
};

// Read .env file
const envPath = path.join(process.cwd(), envFile);
let envContent = "";

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
} else {
  console.error(`❌ Error: ${envFile} not found!`);
  console.log(`\n💡 Tip: Create ${envFile} file in the project root.\n`);
  process.exit(1);
}

// Parse .env file
const envVars = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
});

// Check each required variable
let hasErrors = false;
let hasWarnings = false;

console.log("📋 Environment Variables Status:\n");

Object.entries(requiredVars).forEach(([key, config]) => {
  const value = envVars[key];
  const isOptional = config.optional === true;

  if (!value) {
    if (isOptional) {
      console.log(`⚠️  ${key}: Not set (optional)`);
      hasWarnings = true;
    } else {
      console.log(`❌ ${key}: Missing (required)`);
      hasErrors = true;
    }
    return;
  }

  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    console.log(`❌ ${key}: Invalid format - ${config.errorMessage}`);
    console.log(`   Current value: ${value.substring(0, 20)}...`);
    hasErrors = true;
    return;
  }

  // Mask sensitive values
  const displayValue =
    key.includes("SECRET") || key.includes("KEY")
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;

  console.log(`✅ ${key}: ${displayValue}`);
});

// Summary
console.log("\n" + "=".repeat(60) + "\n");

if (hasErrors) {
  console.log("❌ Some required environment variables are missing or invalid!");
  console.log(
    "\n💡 Please check your .env file and ensure all required variables are set correctly."
  );
  console.log("📖 See docs/OMISE_PAYMENT_SETUP.md for more information.\n");
  process.exit(1);
} else if (hasWarnings) {
  console.log(
    "⚠️  All required environment variables are set, but some optional ones are missing."
  );
  console.log(
    "\n💡 Consider setting optional variables for better functionality.\n"
  );
  process.exit(0);
} else {
  console.log("✅ All environment variables are set correctly!");
  console.log("\n🚀 You're ready to deploy!\n");
  process.exit(0);
}
