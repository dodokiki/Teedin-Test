import { NextResponse } from "next/server";

export async function GET() {
  // Return a valid Chrome DevTools configuration
  const config = {
    origins: ["*"],
    browsers: ["chrome"],
    features: {
      network: true,
      timeline: true,
      heap: true,
      cpu: true,
    },
  };

  return NextResponse.json(config, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
