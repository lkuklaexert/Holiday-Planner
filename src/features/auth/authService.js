import { supabase } from "../../supabase";

/**
 * Authentication service.
 *
 * Encapsulates all authentication operations so UI components remain
 * independent from the underlying authentication provider.
 */

export async function login(email, password) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

export async function updatePassword(password) {
  return supabase.auth.updateUser({
    password,
  });
}