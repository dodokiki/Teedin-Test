// lib/supabaseClient.ts - Singleton pattern เพื่อป้องกัน Multiple GoTrueClient instances
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Singleton pattern เพื่อป้องกันการสร้าง client หลายตัว
let supabaseInstance: ReturnType<typeof createClientComponentClient> | null =
  null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient();
  }
  return supabaseInstance;
})();

// Export types for use in other components if needed
export type { AuthChangeEvent, Session };
