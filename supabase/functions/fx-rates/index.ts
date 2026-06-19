const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { dates, currency } = await req.json();
    
    const results = await Promise.all(
      dates.map(async (date: string) => {
        for (let i = 0; i <= 5; i++) {
          const d = new Date(date + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() - i);
          const tryDate = d.toISOString().slice(0, 10);
          
          const res = await fetch(`https://api.frankfurter.app/${tryDate}?from=${currency}&to=CHF`);
          if (!res.ok) continue;
          
          const json = await res.json();
          const rate = json.rates?.CHF;
          if (typeof rate === "number") {
            return {
              date,
              effectiveDate: json.date !== date ? json.date : undefined,
              rate: Math.round(rate * 10000) / 10000,
              source: "ECB",
            };
          }
        }
        return { date, rate: null, source: "fallback", error: "no_rate_within_5d" };
      })
    );

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
