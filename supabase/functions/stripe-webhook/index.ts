const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !supabaseKey) {
      throw new Error("Variables d'environnement manquantes");
    }

    const body = await req.text();
    const event = JSON.parse(body);

    // Met à jour le plan en base via l'email du broker
    const updatePlan = async (email: string, plan: string) => {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ plan }),
        }
      );
      return res.ok;
    };

    // Paiement confirmé → activer le bon plan
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email ?? session.customer_email;
      // Le plan est passé dans les metadata Stripe au moment du checkout
      const plan = session.metadata?.plan ?? "pro";
      if (email) await updatePlan(email, plan);
    }

    // Abonnement résilié → expirer l'accès
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerRes = await fetch(
        `https://api.stripe.com/v1/customers/${subscription.customer}`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      const customer = await customerRes.json();
      if (customer.email) await updatePlan(customer.email, "expired");
    }

    // Paiement échoué → expirer l'accès
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const customerRes = await fetch(
        `https://api.stripe.com/v1/customers/${invoice.customer}`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      const customer = await customerRes.json();
      if (customer.email) await updatePlan(customer.email, "expired");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
