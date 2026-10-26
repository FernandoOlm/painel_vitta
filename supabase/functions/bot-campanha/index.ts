import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const BOT_URL = Deno.env.get("BOT_CAMPANHA_URL") ?? "http://35.255.126.132:4000";
const WEBHOOK_SECRET = Deno.env.get("BOT_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

/** Recebe o feedback de cada envio individual do bot e atualiza o progresso. */
async function handleWebhookDisparo(payload: any, req: Request) {
  if (WEBHOOK_SECRET) {
    const sent = req.headers.get("x-bot-secret") ?? payload?.secret ?? "";
    if (sent !== WEBHOOK_SECRET) {
      return json({ ok: false, status: 401, body: { error: "Invalid secret" } }, 200);
    }
  }

  const campanhaId = payload?.campaign_id ?? payload?.campanha_id;
  const target = String(payload?.target ?? "").replace(/\D/g, "");
  const status = payload?.status === "sucesso" || payload?.status === "success"
    ? "sucesso"
    : "erro";

  if (!campanhaId || !target) {
    return json({ ok: false, status: 400, body: { error: "campaign_id e target são obrigatórios" } });
  }

  const db = admin();

  await db.from("campanha_logs").upsert(
    {
      campanha_id: campanhaId,
      target,
      status,
      error_message: payload?.error_message ?? null,
      sent_at: payload?.dispatched_at ?? new Date().toISOString(),
    },
    { onConflict: "campanha_id,target" },
  );

  const { count: sucessos } = await db
    .from("campanha_logs")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanhaId)
    .eq("status", "sucesso");

  const { count: erros } = await db
    .from("campanha_logs")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanhaId)
    .eq("status", "erro");

  const { data: campanha } = await db
    .from("campanhas")
    .select("total_destinatarios")
    .eq("id", campanhaId)
    .maybeSingle();

  const total = campanha?.total_destinatarios ?? 0;
  const processados = (sucessos ?? 0) + (erros ?? 0);
  const concluida = total > 0 && processados >= total;

  await db
    .from("campanhas")
    .update({
      enviados: sucessos ?? 0,
      erros: erros ?? 0,
      status: concluida ? "concluida" : "em_andamento",
      finalizada_em: concluida ? new Date().toISOString() : null,
    })
    .eq("id", campanhaId);

  return json({
    ok: true,
    status: 200,
    body: { received: true, processados, total, concluida },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();

    if (action === "webhook_disparo") {
      return await handleWebhookDisparo(payload ?? {}, req);
    }

    let path = "/health";
    let init: RequestInit = { method: "GET" };

    if (action === "restart") {
      path = "/api/whatsapp/restart";
      init = { method: "POST" };
    } else if (action === "disparar") {
      path = "/api/campanhas/disparar";
      // Injeta o campaign_id e o endereço de callback para o bot reportar cada envio.
      const enriched = {
        ...(payload ?? {}),
        campaign_id: payload?.campaignId ?? payload?.campaign_id ?? null,
        webhook_url: `${SUPABASE_URL}/functions/v1/bot-campanha`,
        webhook_secret: WEBHOOK_SECRET || undefined,
      };
      init = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enriched),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${BOT_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { message: text };
    }

    return json({ ok: res.ok, status: res.status, body });
  } catch (e) {
    return json({ ok: false, status: 0, body: { error: String(e) } });
  }
});
