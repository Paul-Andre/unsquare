// create-checkout-session/index.ts
// Supabase Edge Function (Deno) — Create a Stripe checkout session

// @ts-ignore: Deno is available in Supabase Edge Function runtime
declare const Deno: any;

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY environment variable.");
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
}

// Import Stripe SDK and Supabase client for Deno
import Stripe from "https://esm.sh/stripe@latest?target=deno";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  price?: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
}

function errorResponse(message: string, status: number = 400, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return errorResponse("Server misconfiguration: missing required environment variables", 500);
    }

    // Initialize Supabase client with the Authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized: Missing authorization header", 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Unauthorized: User not authenticated", 401);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    const body = await req.json().catch(() => null) as RequestBody | null;

    // Default values from the Express example
    const priceId = body?.price || "price_1ShNdwAVJE8pXXhAfdf3SHTY";
    const quantity = body?.quantity || 1;
    
    // Get the domain from the request or use a default
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:8000";
    const baseUrl = new URL(origin).origin;
    const successUrl = body?.success_url || `${baseUrl}/success.html`;
    const cancelUrl = body?.cancel_url || `${baseUrl}/cancel.html`;

    // Create checkout session with user ID in metadata
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      metadata: {
        user_id: user.id,
      },
    });

    // Return the session URL (client can redirect to it)
    return jsonResponse({ url: session.url }, 200);

  } catch (err) {
    console.error("Unhandled error in create-checkout-session:", err);
    return errorResponse(
      "Internal server error",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});

