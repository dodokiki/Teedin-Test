// Check Omise Mode (Test or Live)
const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "";

if (!publicKey) {
  console.log("❌ ไม่พบ NEXT_PUBLIC_OMISE_PUBLIC_KEY");
  process.exit(1);
}

if (publicKey.startsWith("pk_test_")) {
  console.log("✅ Test Mode (จำลองการชำระเงิน)");
  console.log("   - ใช้บัตรทดสอบได้");
  console.log("   - ไม่ใช่เงินจริง");
  console.log("   - เหมาะสำหรับการทดสอบ");
} else if (publicKey.startsWith("pk_live_")) {
  console.log("💰 Live Mode (ชำระเงินจริง)");
  console.log("   - ใช้บัตรจริงได้");
  console.log("   - เป็นเงินจริง");
  console.log("   - ใช้ใน Production");
} else {
  console.log("❓ ไม่รู้จักรูปแบบของ Omise Key");
  console.log(`   Key: ${publicKey.substring(0, 20)}...`);
}
