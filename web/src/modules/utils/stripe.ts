"use strict";

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './api.ts';

export interface CreateCheckoutSessionOptions {
  price?: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
}

/**
 * Creates a Stripe checkout session and redirects to it.
 * 
 * @param options - Optional parameters for the checkout session
 * @returns Promise that resolves when the redirect is initiated
 * @throws Error if the checkout session creation fails
 */
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

