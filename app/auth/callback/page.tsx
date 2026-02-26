"use client";

import { useAuth } from "@/contexts/auth-context";
import { extractErrorMessage } from "@/lib/error-utils";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
export default function AuthCallback() {
  const router = useRouter();
  const {
    setIsLoggedIn,
    setUserRole,
    setUser,
    setSession,
    accounts,
    switchAccount,
    removeAccount,
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to handle errors and clean up add-account state
  const handleAuthError = (msg: string, userIdToRemove?: string) => {
    console.error("Auth Error:", msg);
    // Clear add-account flags so this failed attempt doesn't affect future logins
    if (typeof window !== "undefined") {
      localStorage.removeItem("isAddingAccount");
      localStorage.removeItem("addingAccountFrom");
    }

    // If we have a specific user ID that failed validation, ensure it's removed from the accounts list
    // This prevents "invalid" accounts from appearing in the switch account list
    if (userIdToRemove) {
      console.log("Removing invalid account from list:", userIdToRemove);
      removeAccount(userIdToRemove).catch(err =>
        console.error("Failed to remove account:", err)
      );
    }

    setError(msg);
    setLoading(false);
  };

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const processUserSession = async (session: any) => {
      try {
        console.log("✅ Processing user session:", session.user.email);

        const appProv = (session?.user?.app_metadata as any)?.provider;
        const userProv = (session?.user?.user_metadata as any)?.provider;
        const currentProvider = appProv || userProv || "email";
        const isGoogleSession = currentProvider === "google";
        const isLineSession = currentProvider === "line";
        const lineBypass =
          typeof window !== "undefined" &&
          localStorage.getItem("line_auth") === "1";
        if (lineBypass) {
          try {
            localStorage.removeItem("line_auth");
          } catch (_) {}
        }

        try {
          const resp = await fetch(
            `/api/auth/check-provider?email=${encodeURIComponent(session.user.email)}`
          );
          const info = await resp.json();
          const original = info?.provider as string | null;
          if (
            (original === "google" && !isGoogleSession) ||
            (original === "line" && !isLineSession && !lineBypass)
          ) {
            await supabase.auth.signOut();
            if (original === "google") {
              handleAuthError(
                "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google",
                session.user.id
              );
            } else if (original === "line") {
              handleAuthError(
                "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE",
                session.user.id
              );
            }
            return;
          }
        } catch (_) {}

        // Fetch user role from database
        let { data: userData, error: userError } = await supabase
          .from("users")
          .select("role, first_name, last_name, email, phone")
          .eq("id", session.user.id)
          .single();

        console.log("Database query result:", { userData, userError });

        if (userError || !userData) {
          console.log(
            "🔄 User not found in database, creating new user (OAuth Sign Up)..."
          );
          console.log("User metadata:", session.user.user_metadata);
          console.log("User ID:", session.user.id);
          console.log("User email:", session.user.email);

          // Create new user record for OAuth user
          const userMetadata = session.user.user_metadata;
          const now = new Date().toISOString();

          // Use the session user ID (which should be a valid UUID from Supabase Auth)
          const newUserData = {
            id: session.user.id, // This should already be a valid UUID from Supabase Auth
            role: "customer", // Default role for OAuth users
            first_name:
              userMetadata?.full_name?.split(" ")[0] ||
              userMetadata?.given_name ||
              "",
            last_name:
              userMetadata?.full_name?.split(" ").slice(1).join(" ") ||
              userMetadata?.family_name ||
              "",
            email: session.user.email,
            phone: userMetadata?.phone || "",
            created_at: now,
            updated_at: now,
          };

          console.log("Creating user with data:", newUserData);

          const { data: insertedUser, error: insertError } = await supabase
            .from("users")
            .insert(newUserData)
            .select();

          if (insertError) {
            console.error("❌ Failed to create user record:", insertError);
            console.error("Insert error details:", {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
            });

            // Check if it's a duplicate user error
            if (
              insertError.code === "23505" &&
              insertError.message.includes("duplicate")
            ) {
              console.log(
                "🔄 User already exists, resolving by email (possible email-first + linked SSO)..."
              );
              const { data: existingByEmail, error: fetchByEmailErr } =
                await supabase
                  .from("users")
                  .select("id, role, first_name, last_name, email, phone")
                  .eq("email", session.user.email)
                  .single();

              if (existingByEmail && !fetchByEmailErr) {
                console.log(
                  "✅ Found existing email-first user:",
                  existingByEmail.id
                );
                // End current mismatched OAuth session and create session for existing user via magic link
                await supabase.auth.signOut();
                try {
                  const sessionResp = await fetch("/api/auth/line/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: existingByEmail.id }),
                  });
                  if (!sessionResp.ok) {
                    const errBody = await sessionResp.json().catch(() => ({}));
                    console.error(
                      "❌ Failed to generate magic link for existing user",
                      errBody
                    );
                    handleAuthError("ไม่สามารถสร้างเซสชันได้", session.user.id);
                    return;
                  }
                  const linkData = await sessionResp.json();
                  if (linkData.magic_link) {
                    window.location.href = linkData.magic_link;
                    return;
                  }
                } catch (e) {
                  console.error("❌ Exception generating magic link:", e);
                }
                handleAuthError(
                  "ไม่สามารถสร้างบัญชีผู้ใช้ได้: duplicate email",
                  session.user.id
                );
                return;
              } else {
                handleAuthError(
                  "ไม่สามารถสร้างบัญชีผู้ใช้ได้: " + insertError.message,
                  session.user.id
                );
                return;
              }
            } else {
              handleAuthError(
                "ไม่สามารถสร้างบัญชีผู้ใช้ได้: " + insertError.message,
                session.user.id
              );
              return;
            }
          }

          if (insertedUser) {
            console.log("✅ User record created successfully:", insertedUser);
            userData = insertedUser[0];
          }

          // Create customer record
          const customerData = {
            user_id: session.user.id,
            full_name:
              userMetadata?.full_name ||
              `${userMetadata?.given_name || ""} ${userMetadata?.family_name || ""}`.trim(),
            created_at: now,
          };

          console.log("Creating customer with data:", customerData);

          const { data: insertedCustomer, error: customerError } =
            await supabase.from("customers").insert(customerData).select();

          if (customerError && !customerError.message.includes("duplicate")) {
            console.error(
              "❌ Failed to create customer record:",
              customerError
            );
            console.error("Customer error details:", {
              message: customerError.message,
              code: customerError.code,
              details: customerError.details,
              hint: customerError.hint,
            });
          } else {
            console.log(
              "✅ Customer record created successfully:",
              insertedCustomer
            );
          }

          console.log("✅ New OAuth user created successfully (Sign Up)");
        } else {
          console.log("✅ Existing user found (Login)");
        }

        // Set auth state
        const role = userData?.role || "customer";

        // Prevent admins from logging in via OAuth
        if (role === "admin" || role === "super_admin") {
          await supabase.auth.signOut();
          handleAuthError(
            "ไม่สามารถเข้าสู่ระบบด้วย Google สำหรับผู้ดูแลระบบ",
            session.user.id
          );
          return;
        }

        // Store auth state
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: session.user,
            session: session,
          })
        );

        setIsLoggedIn(true);
        setUserRole(role as any);
        setUser(session.user);
        setSession(session);

        const isNewUser = userError || !userData;
        console.log(`✅ OAuth ${isNewUser ? "Sign Up" : "Login"} successful:`, {
          email: session.user.email,
          role: role,
          userId: session.user.id,
          isNewUser: isNewUser,
        });

        // Redirect to dashboard or home page
        router.push("/");
      } catch (error) {
        console.error(
          "❌ Process user session error:",
          extractErrorMessage(error)
        );
        handleAuthError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
    };

    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Processing OAuth callback...");
        console.log("Current URL:", window.location.href);
        console.log("URL Search:", window.location.search);
        console.log("URL Hash:", window.location.hash);

        // Check if we have OAuth parameters in URL (both search and hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const errorParam = urlParams.get("error");
        if (errorParam === "provider_mismatch") {
          const required = urlParams.get("required");
          if (required === "google") {
            handleAuthError(
              "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google"
            );
          } else if (required === "line") {
            handleAuthError("บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE");
          } else {
            handleAuthError(
              "บัญชีนี้สมัครด้วยอีเมลและรหัสผ่าน กรุณาเข้าสู่ระบบด้วยอีเมล"
            );
          }
          return;
        }
        const hasOAuthParams =
          urlParams.has("code") ||
          urlParams.has("state") ||
          urlParams.has("access_token") ||
          hashParams.has("code") ||
          hashParams.has("state") ||
          hashParams.has("access_token");

        console.log("Has OAuth params:", hasOAuthParams);
        console.log(
          "URL search params:",
          Object.fromEntries(urlParams.entries())
        );
        console.log(
          "URL hash params:",
          Object.fromEntries(hashParams.entries())
        );

        // Check if this is a LINE OAuth callback with query parameters
        const provider = urlParams.get("provider");
        if (provider === "line") {
          console.log("🔵 LINE OAuth callback detected");
          const email = urlParams.get("email");
          const name = urlParams.get("name");
          const userId = urlParams.get("userId");
          const isNewUser = urlParams.get("isNewUser") === "true";
          const errorParam = urlParams.get("error");

          if (errorParam) {
            console.error("❌ LINE callback error:", errorParam);
            handleAuthError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
            return;
          }

          if (!userId) {
            console.error("❌ No user ID provided in LINE callback");
            handleAuthError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
            return;
          }

          console.log("✅ LINE user ID found:", userId);

          // Try to reuse an existing Supabase session for the LINE user first
          const {
            data: { session: currentSession },
            error: currentSessionError,
          } = await supabase.auth.getSession();
          console.log("LINE current session lookup:", {
            currentSession,
            currentSessionError,
          });

          if (currentSession?.user?.id === userId) {
            console.log(
              "✅ Existing Supabase session matches LINE user, processing session"
            );
            await processUserSession(currentSession);
            return;
          }

          // Check if Supabase Auth already knows the user and can provide a session after refresh
          const {
            data: { user: directUser },
            error: directUserError,
          } = await supabase.auth.getUser();
          console.log("LINE direct user lookup:", {
            directUser,
            directUserError,
          });

          if (directUser?.id === userId) {
            const {
              data: { session: refreshedSession },
              error: refreshedSessionError,
            } = await supabase.auth.getSession();
            console.log("LINE refreshed session lookup:", {
              refreshedSession,
              refreshedSessionError,
            });
            if (refreshedSession?.user?.id === userId) {
              console.log(
                "✅ Session restored for LINE user, processing session"
              );
              await processUserSession(refreshedSession);
              return;
            }
          }

          console.log(
            "No active session for LINE user, generating magic link..."
          );
          const sessionResponse = await fetch("/api/auth/line/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          });

          if (!sessionResponse.ok) {
            const errorBody = await sessionResponse.json().catch(() => ({}));
            console.error("❌ Failed to generate magic link", errorBody);
            handleAuthError("ไม่สามารถสร้างเซสชันได้");
            return;
          }

          const magicLinkData = await sessionResponse.json();

          if (magicLinkData.magic_link) {
            try {
              localStorage.setItem("line_auth", "1");
            } catch (_) {}
            console.log(
              `Redirecting to magic link for LINE OAuth ${isNewUser ? "Sign Up" : "Login"}:`,
              {
                email,
                name,
                userId,
                isNewUser,
              }
            );
            window.location.href = magicLinkData.magic_link;
            return;
          }

          console.error(
            "❌ No magic link received for LINE user",
            magicLinkData
          );
          handleAuthError("ไม่สามารถเข้าสู่ระบบได้");
          return;
        }

        // Check for any OAuth-related parameters
        const allParams = {
          search: Object.fromEntries(urlParams.entries()),
          hash: Object.fromEntries(hashParams.entries()),
        };
        console.log("All URL parameters:", allParams);

        // Try to get session first
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("Initial session data:", session);
        console.log("Initial error:", error);

        if (session?.user) {
          console.log("✅ Session found immediately, processing...");
          await processUserSession(session);
          return;
        }

        // If we have OAuth params but no session, try to process them manually
        if (hasOAuthParams) {
          console.log("🔄 OAuth params detected, processing manually...");

          // Extract tokens from URL hash
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresAt = hashParams.get("expires_at");

          console.log("Extracted tokens:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            expiresAt: expiresAt,
          });

          if (accessToken) {
            try {
              // Try to set the session manually using the access token
              const {
                data: { session: manualSession },
                error: manualError,
              } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });

              console.log("Manual session creation result:", {
                manualSession,
                manualError,
              });

              if (manualSession?.user) {
                console.log("✅ Session created manually, processing...");
                await processUserSession(manualSession);
                return;
              }
            } catch (error) {
              console.error("❌ Error creating manual session:", error);
            }
          }

          // Wait a bit for Supabase to process the OAuth callback
          console.log("🔄 Waiting for Supabase to process OAuth callback...");
          await new Promise(resolve => setTimeout(resolve, 3000));

          const {
            data: { session: delayedSession },
            error: delayedError,
          } = await supabase.auth.getSession();
          console.log("Delayed session data:", delayedSession);
          console.log("Delayed error:", delayedError);

          if (delayedSession?.user) {
            console.log("✅ Session found after delay, processing...");
            await processUserSession(delayedSession);
            return;
          }

          // If still no session, try to get user directly
          const {
            data: { user: directUser },
            error: directUserError,
          } = await supabase.auth.getUser();
          console.log("Direct user check:", { directUser, directUserError });

          if (directUser) {
            console.log("✅ User found directly, creating session...");
            const {
              data: { session: userSession },
            } = await supabase.auth.getSession();
            if (userSession) {
              await processUserSession(userSession);
              return;
            }
          }
        }

        // Check if we're in a callback URL but no OAuth params (might be a redirect issue)
        if (window.location.pathname === "/auth/callback" && !hasOAuthParams) {
          console.log(
            "🔄 Callback URL but no OAuth params - checking for existing session..."
          );

          // Try to get session first
          const {
            data: { session: callbackSession },
            error: callbackSessionError,
          } = await supabase.auth.getSession();
          console.log("Callback session check:", {
            callbackSession,
            callbackSessionError,
          });

          if (callbackSession?.user) {
            console.log("✅ Session found in callback, checking database...");

            // Check if user exists in our database
            const { data: existingUser, error: dbError } = await supabase
              .from("users")
              .select("id, role, first_name, last_name, email, phone")
              .eq("id", callbackSession.user.id)
              .single();

            console.log("Database check result:", { existingUser, dbError });

            if (existingUser) {
              console.log("✅ User exists in database, processing session...");
              await processUserSession(callbackSession);
              return;
            } else {
              console.log(
                "🔄 User not found in database, redirecting to sign up..."
              );
              router.push("/oauth-signup");
              return;
            }
          }

          // If no session, try to get user directly
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          console.log("Direct user check:", { user, userError });

          if (user) {
            console.log("✅ User found in Supabase Auth, checking database...");

            // Check if user exists in our database
            const { data: existingUser, error: dbError } = await supabase
              .from("users")
              .select("id, role, first_name, last_name, email, phone")
              .eq("id", user.id)
              .single();

            console.log("Database check result:", { existingUser, dbError });

            if (existingUser) {
              console.log("✅ User exists in database, creating session...");
              const {
                data: { session: userSession },
              } = await supabase.auth.getSession();
              if (userSession) {
                await processUserSession(userSession);
                return;
              }
            } else {
              console.log(
                "🔄 User not found in database, redirecting to sign up..."
              );
              router.push("/oauth-signup");
              return;
            }
          }
        }

        console.log(
          "🔄 No immediate session, setting up auth state listener..."
        );

        // Set up auth state change listener
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            console.log("Auth state change event:", event);
            console.log("Auth state change session:", session);

            if (event === "SIGNED_IN" && session?.user) {
              await processUserSession(session);
            } else if (event === "SIGNED_OUT") {
              handleAuthError("การเข้าสู่ระบบถูกยกเลิก");
            } else if (event === "TOKEN_REFRESHED" && session?.user) {
              await processUserSession(session);
            } else if (event === "INITIAL_SESSION" && session?.user) {
              await processUserSession(session);
            } else if (event === "INITIAL_SESSION" && !session) {
              console.log("INITIAL_SESSION event without session");

              // Try to get user directly from Supabase Auth
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (user && !userError) {
                console.log(
                  "✅ User found in Supabase Auth, creating session..."
                );
                const {
                  data: { session: newSession },
                } = await supabase.auth.getSession();
                if (newSession) {
                  await processUserSession(newSession);
                  return;
                }
              }

              console.log(
                "🔄 No user found, redirecting to OAuth sign up flow"
              );
              router.push("/oauth-signup");
            }
          }
        );

        subscription = authSubscription;

        // Set timeout to avoid infinite loading
        timeoutId = setTimeout(() => {
          console.error("❌ Timeout waiting for auth state change");
          console.log("🔄 Timeout - redirecting to OAuth sign up flow");
          router.push("/oauth-signup");
        }, 15000);
      } catch (error) {
        console.error(
          "❌ Auth callback exception:",
          extractErrorMessage(error)
        );
        handleAuthError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
    };

    handleAuthCallback();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router, setIsLoggedIn, setUserRole, setUser, setSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={async () => {
              if (accounts && accounts.length > 0) {
                // Try to switch back to the first available account
                await switchAccount(accounts[0].user.id);
              } else {
                router.push("/");
              }
            }}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {accounts && accounts.length > 0
              ? "กลับสู่บัญชีเดิม"
              : "กลับสู่หน้าหลัก"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
