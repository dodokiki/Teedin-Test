import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle Chrome DevTools specific endpoint
  if (pathname.includes("com.chrome.devtools.json")) {
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

  // Handle other well-known requests
  return NextResponse.json(
    { message: "Well-known endpoint not found" },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
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
