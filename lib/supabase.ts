import { createClient } from "@supabase/supabase-js";

// Singleton pattern เพื่อป้องกัน Multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// ใช้ environment variables แทน hard-coded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// ✅ Cache rememberMe value เพื่อลดการ check storage
let cachedRememberMe: boolean | null = null;
let rememberMeCheckTime = 0;
const REMEMBER_ME_CACHE_TTL = 60000; // Cache 1 นาที

const getRememberMe = (): boolean => {
  const now = Date.now();
  // ✅ ใช้ cache ถ้ายังไม่หมดอายุ
  if (
    cachedRememberMe !== null &&
    now - rememberMeCheckTime < REMEMBER_ME_CACHE_TTL
  ) {
    return cachedRememberMe;
  }

  // เช็คค่าใหม่
  cachedRememberMe = localStorage.getItem("rememberMe") === "true";
  rememberMeCheckTime = now;
  return cachedRememberMe;
};

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // ✅ Storage แบบไดนามิก พร้อม caching
        storage:
          typeof window === "undefined"
            ? undefined
            : {
                getItem: (key: string) => {
                  const remember = getRememberMe();
                  return (remember ? localStorage : sessionStorage).getItem(
                    key
                  );
                },
                setItem: (key: string, value: string) => {
                  const remember = getRememberMe();
                  const target = remember ? localStorage : sessionStorage;
                  // ป้องกันค้างคนละที่: ลบจากอีกฝั่งก่อน
                  (remember ? sessionStorage : localStorage).removeItem(key);
                  target.setItem(key, value);
                },
                removeItem: (key: string) => {
                  sessionStorage.removeItem(key);
                  localStorage.removeItem(key);
                },
              },
      },
    });
  }
  return supabaseInstance;
})();
