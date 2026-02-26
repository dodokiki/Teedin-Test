#!/usr/bin/env node

/**
 * Script สำหรับดึง ngrok URL จาก ngrok API
 * Usage: node scripts/get-ngrok-url.js
 */

const http = require("http");

const options = {
  hostname: "localhost",
  port: 4040,
  path: "/api/tunnels",
  method: "GET",
};

const req = http.request(options, res => {
  let data = "";

  res.on("data", chunk => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);

      if (response.tunnels && response.tunnels.length > 0) {
        const httpsTunnel = response.tunnels.find(t => t.proto === "https");

        if (httpsTunnel) {
          const webhookUrl = `${httpsTunnel.public_url}/api/omise-webhook`;
          console.log("\n" + "=".repeat(60));
          console.log("🌐 Ngrok URL:");
          console.log("=".repeat(60));
          console.log(`\n📋 Forwarding URL: ${httpsTunnel.public_url}`);
          console.log(`\n🔗 Webhook URL: ${webhookUrl}`);
          console.log("\n" + "=".repeat(60));
          console.log(
            "\n💡 Copy the Webhook URL above and paste it in Omise Dashboard"
          );
          console.log("   Settings > Webhooks > Add new webhook\n");
        } else {
          console.log(
            "❌ No HTTPS tunnel found. Make sure ngrok is running with HTTPS."
          );
        }
      } else {
        console.log("❌ No tunnels found. Make sure ngrok is running.");
        console.log("   Run: ngrok http 3000");
      }
    } catch (error) {
      console.error("❌ Error parsing ngrok response:", error.message);
      console.log("\n💡 Make sure ngrok is running: ngrok http 3000");
    }
  });
});

req.on("error", error => {
  console.error("❌ Error connecting to ngrok:", error.message);
  console.log("\n💡 Make sure ngrok is running: ngrok http 3000");
  console.log("   Then open http://localhost:4040 in your browser\n");
});

req.end();
