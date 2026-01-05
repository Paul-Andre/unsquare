// create-checkout-session/index.ts
// Supabase Edge Function (Deno) — Create a Stripe checkout session

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY environment variable.");
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
}

// Product to Stripe Price ID mapping, test
// const PRODUCT_PRICES: Record<string, string> = {
//   dailyWeeklyArchive: "price_1ShNdwAVJE8pXXhAfdf3SHTY",
//   fullAccess: "price_1SjhqoAVJE8pXXhAjfUFsyYR",
// };

// Product to Stripe Price ID mapping, live
const PRODUCT_PRICES: Record<string, string> = {
  dailyWeeklyArchive: "price_1Sh0uIAVJE8pXXhAr3FKBzLs",
  fullAccess: "price_1SjhctAVJE8pXXhAdOwqL4Y6",
};

function getPriceId(product: string): string|null {
    return PRODUCT_PRICES[product]??null;
}

// Import Stripe SDK and Supabase client for Deno
import Stripe from "npm:stripe@^17";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  product?: string;
  products?: string[];
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
  customer_email?: string;
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

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
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
    console.log("User", user, user.email, user.is_anonymous, user.id);

    // Create Supabase client with service role key for purchase checks
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const body = await req.json().catch(() => null) as RequestBody | null;

    // Normalize products: support both single product and products array
    let requestedProducts: string[] = [];
    if (body?.products) {
      requestedProducts = body.products;
    } else if (body?.product) {
      requestedProducts = [body.product];
    } else {
      return errorResponse("Missing required field: product or products", 400);
    }

    // Validate all products exist
    for (const product of requestedProducts) {
      if (getPriceId(product) === null) {
        return errorResponse(`Invalid product: ${product}`, 400);
      }
    }

    // Check for existing purchases
    const isAnonymous = user.is_anonymous === true || (user.email === null && (!user.identities || user.identities.length === 0));
    const hasAccess: string[] = [];
    const needsPurchase: string[] = [];

    for (const product of requestedProducts) {
      // Build query: check by user_id always, and by email if non-anonymous
      let query = supabaseService
        .from("purchases")
        .select("id")
        .eq("product", product);

      if (!isAnonymous && user.email) {
        // For non-anonymous users, check by user_id OR email
        query = query.or(`user_id.eq.${user.id},email.eq.${user.email}`);
      } else {
        // For anonymous users, only check by user_id
        query = query.eq("user_id", user.id);
      }

      const { data: existingPurchases, error: purchaseError } = await query;

      if (purchaseError) {
        console.error("Error checking purchase:", purchaseError);
        // Continue to next product on error (assume no access)
        needsPurchase.push(product);
        continue;
      }

      if (existingPurchases && existingPurchases.length > 0) {
        hasAccess.push(product);
      } else {
        needsPurchase.push(product);
      }
    }

    // If user already has access to all requested products, return confirmation
    if (needsPurchase.length === 0) {
      return jsonResponse({ hasAccess, needsPurchase: [] }, 200);
    }

    // If user has some products but not all, return partial access info
    // (Client can decide how to handle this - for now we'll proceed with checkout for missing products)
    if (hasAccess.length > 0) {
      // Log partial access but continue with checkout for missing products
      console.log(`User already has access to: ${hasAccess.join(", ")}`);
    }
    
    // Get the domain from the request or use a default
    console.log(req.headers);
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:8000";
    const baseUrl = new URL(origin).origin;
    const successUrl = body?.success_url || baseUrl;
    const cancelUrl = body?.cancel_url || baseUrl

    // Determine customer email - use authenticated user's email, or from request body, or let Stripe collect it
    const customerEmail = user?.email || body?.customer_email || undefined;

    // Create line items for products that need purchase
    // Note: When using existing price IDs, we can't add metadata directly to line items during creation
    // We'll store products array in session metadata and match by index in webhook
    const lineItems = needsPurchase.map(product => {
      const priceId = getPriceId(product);
      if (priceId===null) {
        throw("priceId is null. Normally this shouldn't happen because it was tested earlier");
      }
      return {
        price: priceId,
        quantity: body?.quantity || 1,
        metadata: {
          product: product,
        },
      }
    });

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer_email: customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
    };

    // Add customer email if available
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    // Add metadata: user_id, email
    const metadata: Record<string, string> = {
      user_id: user.id,
    };

    sessionConfig.metadata = metadata;

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return the session URL and access info
    return jsonResponse({ 
      url: session.url,
      hasAccess: hasAccess.length > 0 ? hasAccess : undefined,
      needsPurchase: needsPurchase.length > 0 ? needsPurchase : undefined,
    }, 200);

  } catch (err) {
    console.error("Unhandled error in create-checkout-session:", err);
    return errorResponse(
      "Internal server error",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});

