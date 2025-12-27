// stripe-webhook/index.ts
// Supabase Edge Function (Deno) — Handle Stripe webhook events

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY environment variable.");
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

// Import Stripe SDK and Supabase client for Deno
import Stripe from "npm:stripe@^17";
import { createClient } from "jsr:@supabase/supabase-js@2";

function errorResponse(message: string, status: number = 400, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Server misconfiguration: missing required environment variables", 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia"
    });

    // Create Supabase client with service role key for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the raw body and signature header for webhook verification
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return errorResponse("Missing stripe-signature header", 400);
    }

    // Get raw body as text for signature verification
    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      // Verify webhook signature
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      ) as Stripe.Event;
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return errorResponse(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
        400
      );
    }

    // Handle the event
    console.log(`Received webhook event: ${event.type} (id: ${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", {
          sessionId: session.id,
          customerId: session.customer,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        
        const userId = session.metadata?.user_id || null;
        const email = session.metadata?.email || session.customer_email || null;
        
        console.log("User that purchased was:", userId, "Email:", email);

        // Retrieve line items from the session
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id,
          {expand: ['data.price']}
        );

        // Insert each line item as a purchase record (idempotent)
        // Match products to line items by index (they should be in the same order)
        for (const lineItem of lineItems.data) {
          console.log("Line item:", lineItem);
          // TODO TypeScript type is incorrect...
          // perhaps we need to make sure we're using the most recent version of the Stripe SDK
          const product = lineItem.metadata?.product;
          
          if (!product) {
            console.error(`No product found for line item ${lineItem.id}`);
            continue;
          }

          const lineItemId = lineItem.id;
          const quantity = lineItem.quantity || 1;

          // Use SQL-level upsert with ON CONFLICT for idempotency
          // Note: This requires line_item_id to have a UNIQUE constraint
          // The Supabase JS client's upsert should handle ON CONFLICT if the constraint exists
          const { error: upsertError } = await supabase
            .from('purchases')
            .upsert({
              user_id: userId,
              email: email,
              product: product,
              quantity: quantity,
              stripe_session_id: session.id,
              line_item_id: lineItemId,
            }, {
              onConflict: 'line_item_id',
            });

          if (upsertError) {
            // If insert also fails, it's likely a duplicate (idempotent - that's fine)
            if (upsertError.code === '23505') { // Unique violation
              console.log(`Purchase already exists for line item ${lineItemId} (idempotent)`);
            } else {
              console.error(`Error inserting purchase for line item ${lineItemId}:`, upsertError);
            }
          } else {
            console.log(`Purchase recorded for product ${product}, line item ${lineItemId}`);
          }
        }
        
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment intent succeeded:", {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        
        // TODO: Handle successful payment
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment intent failed:", {
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error,
        });
        
        // TODO: Handle failed payment
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription ${event.type}:`, {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });
        
        // TODO: Handle subscription events
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    return jsonResponse({ received: true, eventId: event.id }, 200);

  } catch (err) {
    console.error("Unhandled error in stripe-webhook:", err);
    return errorResponse(
      "Internal server error",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});

