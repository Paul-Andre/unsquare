"use strict";

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './api.ts';
import { getCurrentUser } from './auth.ts';
import { appContext } from '../core/AppContext.ts';
import { Continuation, processContinuations, buildUrl } from '../core/continuations.ts';
import type { AuthResult } from '../ui/AuthModal.ts';
import type { User } from '@supabase/supabase-js';

export interface CreateCheckoutSessionOptions {
  price?: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
}


export async function ensureAuthenticated(continuations: Continuation[]): Promise<{ user: User | null; skipped: boolean }> {
  // Check if already authenticated
  const user = await getCurrentUser();
  if (user) {
    processContinuations(continuations);
    return { user, skipped: false };
  }

  // If no user authenticated, show auth modal and wait for authentication or skip
  try {
    const result = await appContext.authModal.show(continuations);
    // Process continuations after auth or skip
    processContinuations(continuations);
    return result;
  } catch (error) {
    console.error('Authentication cancelled', error);
    // If cancelled, treat as skipped
    processContinuations(continuations);
    return { user: null, skipped: true };
  }
}


export async function createCheckoutSession(options: CreateCheckoutSessionOptions = {}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        price: options.price,
        quantity: options.quantity,
        success_url: options.success_url,
        cancel_url: options.cancel_url,
      }
    });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const context = await error.context.json();
        const message = error.message;
        console.log(error.context.status, context);

      } else {
        throw error;
      }
    }

    if (!data?.url) {
      throw new Error("No checkout URL returned from server");
    }

    // Redirect to the Stripe checkout page
    window.location.href = data.url;
  } catch (err) {
    console.error("Error in createCheckoutSession:", err);
    throw err;
  }
}

/**
 * Test function to create a checkout session with default values.
 * Can be called from the browser console for testing.
 */
export async function testCheckout() {
  console.log("Creating test checkout session...");
  try {
    await createCheckoutSession();
  } catch (error) {
    console.error("Test checkout failed:", error);
    alert(`Checkout failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Track if we're currently handling authentication to avoid recursion
let isHandlingAuth = false;

export async function purchaseDailyWeeklyArchive(continuations: Continuation[]) {
  // Check if user is already authenticated
  const user = await getCurrentUser();
  
  if (!user && !isHandlingAuth) {
    // If not authenticated and not already handling auth, show auth modal
    isHandlingAuth = true;
    try {
      await ensureAuthenticated(["purchaseDailyWeeklyArchive", ...continuations]);
    } finally {
      isHandlingAuth = false;
    }
    // After ensureAuthenticated returns (whether authenticated or skipped), proceed to checkout
    // Note: If user skipped, continuations were processed which may call this function again
    // But isHandlingAuth will prevent showing the modal again
  }
  
  // Proceed directly to checkout (works for both authenticated and skipped users)
  // The success_url should include the navigation continuations (not purchaseDailyWeeklyArchive)
  // since the purchase will be complete after Stripe redirects back
  try {
    // Show redirecting screen
    appContext.redirectingToPaymentModal.show();
    
    await createCheckoutSession({
      price: "price_1ShNdwAVJE8pXXhAfdf3SHTY",
      success_url: buildUrl(continuations),
    });
  } catch (error) {
    // Hide redirecting screen on error
    appContext.redirectingToPaymentModal.hide();
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

