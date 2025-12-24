// stripe-webhook/index.ts
// Supabase Edge Function (Deno) — Handle Stripe webhook events

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY environment variable.");
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
}

// Import Stripe SDK for Deno
import Stripe from "stripe";

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

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return errorResponse("Server misconfiguration: missing Stripe keys", 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

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
        
        const userId = session.metadata?.user_id;
        console.log("User that purchased was:", userId);
        // TODO: Update your database here
        // Example: Mark user as having paid, grant access to premium features, etc.
        // You can use the session.metadata to store custom data like user_id
        
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

