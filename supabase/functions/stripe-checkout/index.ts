const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, plan, coupon } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://swiss-plan-calc.vercel.app";

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY manquante");
    }

    const params: Record<string, string> = {
      "payment_method_types[0]": "card",
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "success_url": `${siteUrl}/auth?mode=signup&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${siteUrl}/?pricing=1`,
      "metadata[plan]": plan,
    };

    // Trial 3 jours sur Pro et Cabinet
    if (plan === "pro" || plan === "cabinet") {
      params["subscription_data[trial_period_days]"] = "3";
    }

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
