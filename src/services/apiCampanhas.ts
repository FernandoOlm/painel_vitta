import { supabase } from '@/integrations/supabase/client';

export interface CampanhaPayload {
  message: string;
  targets: string[];
  mediaUrl?: string;
  scheduledAt?: string; // ISO string para data/hora
  campaignId?: string; // usado para o acompanhamento em tempo real
}

type BotResponse = {
  ok: boolean;
  status: number;
  body: {
    status?: string;
    whatsapp?: string;
    qr?: string | null;
    queueSize?: number;
    message?: string;
    error?: string;
  } | null;
};

/**
 * As chamadas passam por uma função de borda (HTTPS) que conversa com a VPS
 * via HTTP na porta 4000. O runtime do site (Cloudflare Worker) não consegue
 * abrir conexões HTTP em portas não padrão, por isso a ponte fica aqui.
 */
async function callBot(action: 'health' | 'restart' | 'disparar', payload?: unknown) {
  const { data, error } = await supabase.functions.invoke<BotResponse>('bot-campanha', {
    body: { action, payload },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.body?.error || 'Falha ao comunicar com o bot na VPS');
  return data.body;
}

export const dispararCampanha = async (payload: CampanhaPayload) => {
  return await callBot('disparar', payload);
};

export const getBotHealth = async () => {
  return await callBot('health');
};

export const getBotStatusSafe = async () => {
  try {
    return await getBotHealth();
  } catch {
    return null;
  }
};

export const restartBot = async () => {
  return await callBot('restart');
};
