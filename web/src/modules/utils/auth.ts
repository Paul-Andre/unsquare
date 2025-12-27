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
 * Check if a given user is anonymous
 */
export function isAnonymousUser(user: User): boolean {
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


// TODO: because or redirects, we need to check if the accounts has been successfully linked after the redirect
// TODO: also, in the case where linking fails, I will need to sign into
// the google account and manually link the accounts by updating the database
export async function handleGoogleSignInFlow(continuations: Continuation[]): Promise<{ error: AuthError | null }> {
  const user = await getCurrentUser(); 

  // if (user && isAnonymousUser(user)) {
  //   return await linkIdentity('google', continuations);
  // }
  return await signInWithOAuth('google', continuations);
}

export interface EmailSignInResult {
  success: boolean;
  error: AuthError | null;
}

export async function handleEmailSignInFlow(email: string, continuations: Continuation[]): Promise<EmailSignInResult> {
  const user = await getCurrentUser();
  if (user && isAnonymousUser(user)) {
    const { error: updateError } = await updateUserEmail(email);
    if (updateError && !isEmailAlreadyRegisteredError(updateError)) {
      return {
        success: false,
        error: updateError,
      };
    }
  }
  
  const { error } = await signInWithMagicLink(email, continuations);
  if (error) {
    return {
      success: false,
      error,
    };
  }
  
  return { success: true, error: null };
}

export async function handleSkipFlow(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (user && isAnonymousUser(user)) {
    return { user: user, error: null };
  }
  return await signInAnonymously();
}

