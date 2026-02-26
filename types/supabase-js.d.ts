// Minimal ambient declaration for @supabase/supabase-js used in this repo
// This file silences TS2307 when the package or its types are not installed in the editor environment.

declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string, options?: any): any;
  export type User = {
    id: string;
    email?: string | null;
    [key: string]: any;
  };

  export type Session = {
    access_token?: string;
    refresh_token?: string;
    user?: User | null;
    [key: string]: any;
  };

  export type AuthChangeEvent =
    | "SIGNED_IN"
    | "SIGNED_OUT"
    | "TOKEN_REFRESHED"
    | "USER_UPDATED"
    | "USER_DELETED"
    | string;

  export {};
}
