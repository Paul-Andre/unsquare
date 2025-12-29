"use strict";

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './api.ts';
import { getCurrentUser, isAnonymousUser } from './auth.ts';
import { appContext } from '../core/AppContext.ts';
import { Continuation, buildUrl } from '../core/continuations.ts';
import type { AuthResult } from '../ui/AuthModal.ts';
import type { User } from '@supabase/supabase-js';
import { assert } from './helpers.ts';

export interface CreateCheckoutSessionOptions {
  product: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
}


export async function ensureAuthenticated(continuations: Continuation[]): Promise<{ user: User | null }> {
  // Check if already authenticated
  const user = await getCurrentUser();
  if (user) {
    // Check if user is anonymous - if so, still show auth modal to allow account linking
    if (isAnonymousUser(user)) {
      // Anonymous user - show auth modal to allow linking
      try {
        const result = await appContext.authModal.show(continuations);
        return result;
      } catch (error) {
        console.error('Authentication cancelled', error);
        return { user };
      }
    }
    // Non-anonymous authenticated user - proceed
    return { user };
  }

  // If no user authenticated, show auth modal and wait for authentication
  try {
    const result = await appContext.authModal.show(continuations);
    return result;
  } catch (error) {
    console.error('Authentication cancelled', error);
    // If cancelled, return null user
    return { user: null };
  }
}


export async function createCheckoutSession(options: CreateCheckoutSessionOptions): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        product: options.product,
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
        throw new Error(context.error || message);
      } else {
        throw error;
      }
    }

    // Check if user already has access
    if (data?.hasAccess && Array.isArray(data.hasAccess) && data.hasAccess.includes(options.product)) {
      console.log(`User already has access to ${options.product}`);
      // Don't redirect - user already has access
      return;
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
    await createCheckoutSession({
      product: "dailyWeeklyArchive",
    });
  } catch (error) {
    console.error("Test checkout failed:", error);
    alert(`Checkout failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Authenticate (if needed) and then proceed to purchase.
 * This function handles authentication and then calls purchaseDailyWeeklyArchive.
 * It should be used when starting a purchase flow from the UI.
 */
export async function authenticateAndPurchaseDailyWeeklyArchive(continuations: Continuation[]): Promise<void> {
  // Always call ensureAuthenticated to handle:
  // - No user: shows auth modal
  // - Anonymous user: shows auth modal for account linking
  // - Authenticated user: proceeds without modal
  // Note: We pass only the navigation continuations (not "purchaseDailyWeeklyArchive")
  // to avoid recursion when continuations are processed
  await ensureAuthenticated(["purchaseDailyWeeklyArchive", ...continuations]);
  
  await purchaseDailyWeeklyArchive(continuations);
}

/**
 * Initiates purchase. Does not handle authentication.
 */
export async function purchaseDailyWeeklyArchive(continuations: Continuation[]): Promise<void> {
  // Proceed directly to checkout
  // The success_url should include the navigation continuations
  // since the purchase will be complete after Stripe redirects back
  try {
    // Show redirecting screen
    appContext.redirectingToPaymentModal.show();
    
    await createCheckoutSession({
      product: "dailyWeeklyArchive",
      success_url: buildUrl(continuations),
    });
    
    // If we get here without redirecting, user already has access
    appContext.redirectingToPaymentModal.hide();
  } catch (error) {
    // Hide redirecting screen on error
    appContext.redirectingToPaymentModal.hide();
    console.error("Error creating checkout session:", error);
    throw error;
  }
}


type PossibleProducts = "dailyWeeklyArchive" | "fullAccess";

export async function getPurchasedProducts():Promise<Record<string, boolean>>{
  let user = await getCurrentUser();
  if (!user) {
    console.log("User is null, therefore no products purchased.");
    return {};
  }
  let request = {
    p_user_id: user.id,
    p_email: (user.email??null),
  };
  console.log(request);

  let {data, error} = await supabase.rpc("get_purchased_products", request );
  if (error) {
    throw error;
  }
  let ret: Record<string, boolean> = {};
  for (let row of data) {
    
    let product = row.product;
    assert( typeof product == "string");
    ret[product] = true;
  }
  console.log(data, error);

  return ret;
}