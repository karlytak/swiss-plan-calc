const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, brokerId, brokerEmail, plan, coupon } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY manquante");
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://swiss-plan-calc.vercel.app";

    const params: Record<string, string> = {
      "payment_method_types[0]": "card",
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "customer_email": brokerEmail,
      "client_reference_id": brokerId ?? "",
      // Après paiement → page de connexion (pas le dashboard)
      "success_url": `${siteUrl}/auth?paiement=ok`,
      "cancel_url": `${siteUrl}/`,
      // Le plan est transmis au webhook pour activer le bon abonnement en base
      "metadata[plan]": plan ?? "pro",
      "metadata[broker_id]": brokerId ?? "",
      "subscription_data[metadata][plan]": plan ?? "pro",
      // Période d'essai 3 jours sur tous les plans
      "subscription_data[trial_period_days]": "3",
    };

    if (coupon) {
      params["discounts[0][coupon]"] = coupon;
    }

    const body = new URLSearchParams(params);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      throw new Error(session.error?.message ?? "Erreur Stripe");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
