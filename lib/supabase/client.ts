"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Client Components 용 (싱글턴). */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
