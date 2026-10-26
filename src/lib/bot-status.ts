export type BotHealth = {
  status?: string;
  whatsapp?: string;
  qr?: string | null;
  queueSize?: number;
} | null;

/** Fonte única de verdade para interpretar a resposta do bot. */
export function isBotConnected(health: BotHealth): boolean {
  const values = [health?.status, health?.whatsapp]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return values.some((v) => v === "connected" || v === "open" || v === "ready");
}

export function botStatusLabel(health: BotHealth, offline: boolean): string {
  if (offline) return "Serviço indisponível";
  if (isBotConnected(health)) return "WhatsApp conectado";
  if (health?.qr) return "Pronto para escanear";
  return "Aguardando QR Code";
}
