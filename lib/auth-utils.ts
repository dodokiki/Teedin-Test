import { createClient } from "@supabase/supabase-js";

// Utility function to refresh user role from database
export const refreshUserRole = async (userId: string) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.warn("Could not fetch user role from database:", userError);
      return null;
    }

    console.log("✅ Refreshed user role from database:", userData.role);
    localStorage.setItem("userRole", userData.role);
    return userData.role;
  } catch (error) {
    console.error("Error refreshing user role:", error);
    return null;
  }
};
