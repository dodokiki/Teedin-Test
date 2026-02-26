import type {
  CookieMethodsServer,
  CookieOptions,
  CookieOptionsWithName,
} from "@supabase/ssr";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { SUPER_ADMIN_COOKIE_NAME } from "./super-admin-cookie";

const superAdminCookieOptions: CookieOptionsWithName = {
  name: SUPER_ADMIN_COOKIE_NAME,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

const requiredEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { supabaseUrl, supabaseAnonKey };
};

type SuperAdminClient = ReturnType<typeof createBrowserClient>;

let browserClient: SuperAdminClient | null = null;

export const getSuperAdminBrowserClient = (): SuperAdminClient => {
  if (typeof window === "undefined") {
    throw new Error(
      "getSuperAdminBrowserClient can only be used in a browser environment"
    );
  }

  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = requiredEnv();
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: superAdminCookieOptions,
    isSingleton: true,
  });

  return browserClient;
};

export const getSuperAdminServerClient = async () => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requiredEnv();

  const cookieMethods: CookieMethodsServer = {
    getAll: () =>
      cookieStore
        .getAll()
        .map(({ name, value }) => ({ name, value: value ?? "" })),
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: superAdminCookieOptions,
    cookies: cookieMethods,
  });
};

export type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export const createSuperAdminRouteClient = (
  request: NextRequest,
  pendingCookies: PendingCookie[]
) => {
  const { supabaseUrl, supabaseAnonKey } = requiredEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: superAdminCookieOptions,
    cookies: {
      getAll: () =>
        request.cookies
          .getAll()
          .map(({ name, value }) => ({ name, value: value ?? "" })),
      setAll: (cookiesToSet: PendingCookie[]) => {
        cookiesToSet.forEach(cookie => pendingCookies.push(cookie));
      },
    },
  });
};

export const applyPendingCookies = (
  response: NextResponse,
  pendingCookies: PendingCookie[]
) => {
  pendingCookies.forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  });
};

export { SUPER_ADMIN_COOKIE_NAME };
