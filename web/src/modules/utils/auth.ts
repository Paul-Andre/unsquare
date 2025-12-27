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

/**
 * Sign in anonymously
 */
export async function signInAnonymously(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInAnonymously();

  return {
    user: data.user,
    error: error,
  };
}

/**
 * Check if a user is anonymous
 */
export function isAnonymousUser(user: User | null): boolean {
  if (!user) return false;
  // Check if user is anonymous - anonymous users have is_anonymous flag or no email/identities
  return user.is_anonymous === true || (user.email === null && (!user.identities || user.identities.length === 0));
}

/**
 * Link an OAuth identity to the current user (for anonymous users)
 */
export async function linkIdentity(provider: 'google' = 'google', continuations: Continuation[]): Promise<{ error: AuthError | null }> {
  const redirectUrl = buildUrl(continuations);
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: redirectUrl,
    },
  });

  return { error };
}

/**
 * Update the current user's email (for linking email to anonymous users)
 */
export async function updateUserEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    email,
  });

  return { error };
}

/**
 * Check if an error indicates that an email is already registered
 */
export function isEmailAlreadyRegisteredError(error: AuthError | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const status = error.status;
  
  // Check for common error codes/messages indicating email already registered
  return status === 422 || 
         message.includes('already been registered') ||
         message.includes('already registered') ||
         message.includes('user already exists') ||
         message.includes('email address is already registered');
}

/**
 * Handle Google OAuth sign-in flow, including anonymous user linking
 */
export async function handleGoogleSignInFlow(continuations: Continuation[]): Promise<{ error: AuthError | null }> {
  const currentUser = await getCurrentUser();
  const isAnonymous = isAnonymousUser(currentUser);
  
  if (isAnonymous) {
    // Link OAuth identity to anonymous account
    return await linkIdentity('google', continuations);
  } else {
    // Regular OAuth sign-in
    return await signInWithOAuth('google', continuations);
  }
}

/**
 * Handle email sign-in flow, including anonymous user email linking
 */
export interface EmailSignInResult {
  success: boolean;
  error: AuthError | null;
}

export async function handleEmailSignInFlow(email: string, continuations: Continuation[]): Promise<EmailSignInResult> {
  const currentUser = await getCurrentUser();
  const isAnonymous = isAnonymousUser(currentUser);
  
  if (isAnonymous) {
    // For anonymous users, try to update email first to link the identity
    const { error: updateError } = await updateUserEmail(email);
    if (updateError) {
      // If email is already registered, we can still send a sign-in link
      // The user will sign in to their existing account
      if (isEmailAlreadyRegisteredError(updateError)) {
        // Continue to send magic link - user will sign in to existing account
      } else {
        // Other errors - return them
        return {
          success: false,
          error: updateError,
        };
      }
    }
  }
  
  // Send OTP (works for both new users and anonymous users with updated email)
  const { error } = await signInWithMagicLink(email, continuations);
  if (error) {
    return {
      success: false,
      error,
    };
  }
  
  return { success: true, error: null };
}

/**
 * Handle skip/anonymous sign-in flow
 */
export async function handleSkipFlow(): Promise<AuthResult> {
  const currentUser = await getCurrentUser();
  if (isAnonymousUser(currentUser)) {
    // Already anonymous - return existing user
    return { user: currentUser, error: null };
  }
  
  // Not anonymous - create anonymous sign-in
  return await signInAnonymously();
}

/**
 * Handle OTP resend flow
 */
export async function handleResendOTPFlow(email: string, continuations: Continuation[]): Promise<{ error: AuthError | null }> {
  const { error } = await signInWithMagicLink(email, continuations);
  return { error };
}


