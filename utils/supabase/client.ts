import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// สร้าง flag สำหรับตรวจสอบสถานะการเชื่อมต่อ
let isOnline = true;
let lastConnectionCheck = 0;

// ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
const checkConnection = async (): Promise<boolean> => {
  // ตรวจสอบทุก 10 วินาทีเท่านั้น
  const now = Date.now();
  if (now - lastConnectionCheck < 10000) {
    return isOnline;
  }

  lastConnectionCheck = now;

  try {
    // ทดสอบเชื่อมต่อกับ Google (เป็น endpoint ที่มีความเสถียรสูง)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    isOnline = true;
    return true;
  } catch (error) {
    isOnline = false;
    return false;
  }
};

// Create a Supabase client for use in the browser
export const createClient = () => {
  // ใช้ environment variables แทน hard-coded values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // Custom fetch function with retry logic
  const fetchWithRetry = async (
    url: RequestInfo | URL,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> => {
    const { timeout = 30000, ...fetchOptions } = options;

    // ตรวจสอบการเชื่อมต่อก่อน
    const connected = await checkConnection();
    if (!connected) {
      throw new Error("No internet connection available");
    }

    // Maximum number of retry attempts
    const MAX_RETRIES = 3;
    let retries = 0;
    let lastError: Error = new Error("Unknown error occurred");

    while (retries < MAX_RETRIES) {
      try {
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // ปรับ mode เป็น 'cors' เพื่อให้สามารถเชื่อมต่อกับ Supabase API ได้
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          mode: "cors",
          cache: "no-cache", // ไม่ใช้ cache เพื่อหลีกเลี่ยงปัญหา
        });

        // Clear the timeout
        clearTimeout(timeoutId);

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;
        retries++;

        // Wait before retrying (exponential backoff)
        if (retries < MAX_RETRIES) {
          const backoffTime = 1000 * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    throw lastError;
  };

  try {
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: fetchWithRetry,
      },
      db: {
        schema: "public",
      },
    });

    return client;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    throw error;
  }
};
