"use strict";

import { buildUrl, Continuation } from '../core/continuations.ts';
import { supabase } from './api.ts';
import type { User, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    error: error,
  };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return {
    user: data.user,
    error: error,
  };
}

/**
 * Sign in with OAuth provider (Google)
 */
export async function signInWithOAuth(provider: 'google' = 'google', continuations:Continuation[]): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildUrl(continuations),
    },
  });

  return { error };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}

/**
 * Sign in with magic link (OTP) via email
 */
export async function signInWithMagicLink(email: string, continuations: Continuation[]): Promise<{ error: AuthError | null }> {
  const redirectUrl = buildUrl(continuations);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  return { error };
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, token: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  return {
    user: data.user,
    error: error,
  };
}


