import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type BotBody = {
  status?: string;
  whatsapp?: string;
  qr?: string | null;
  queueSize?: number;
  message?: string;
  error?: string;
} | null;

const DEFAULT_BOT_URL = 'http://35.253.246.93:4000';

async function botFetch(path: string, init?: RequestInit) {
  const base = process.env['BOT_CAMPANHA_URL'] || DEFAULT_BOT_URL;
  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: BotBody = null;
  try {
    body = text ? (JSON.parse(text) as BotBody) : null;
  } catch {
    body = { message: text };
  }
  return { ok: res.ok, status: res.status, body };
}

export const getBotHealthFn = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { ok, body } = await botFetch('/health');
      if (!ok || !body) throw new Error('offline');
      return body;
    } catch {
      return { status: 'error', whatsapp: 'disconnected', qr: null, queueSize: 0 };
    }
  });

export const restartBotFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { ok, body } = await botFetch('/api/whatsapp/restart', { method: 'POST' });
    if (!ok) throw new Error('Falha ao reiniciar bot');
    return body ?? { message: 'ok' };
  });

export const dispararCampanhaFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { message: string; targets: string[]; mediaUrl?: string; scheduledAt?: string }) => {
    if (!data?.message?.trim()) throw new Error('A mensagem é obrigatória');
    if (!Array.isArray(data.targets) || data.targets.length === 0) throw new Error('Informe ao menos um destinatário');
    return {
      message: data.message.trim(),
      targets: data.targets.map((t) => {
        let num = String(t).replace(/\D/g, '');
        // Se tem 10 ou 11 dígitos, é DDD + número (adiciona 55 automaticamente)
        if (num.length === 10 || num.length === 11) {
            num = `55${num}`;
        }
        return num;
      }).filter((t) => t.length > 11),
      mediaUrl: data.mediaUrl || undefined,
      scheduledAt: data.scheduledAt || undefined,
    };
  })
  .handler(async ({ data }) => {
    const { ok, body } = await botFetch('/api/campanhas/disparar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!ok) {
      throw new Error(body?.error || 'Erro ao enviar campanha para o bot');
    }
    return body ?? { message: 'Campanha enviada' };
  });
