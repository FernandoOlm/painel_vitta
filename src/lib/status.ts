// Regra central de vencimento usada em tabelas, filtros, cards e contadores.

export const LIMITE_DIAS = 30;

export type SituacaoVenc = "concluido" | "cancelado" | "vencido" | "a_vencer" | "em_dia" | "sem_data";

export const STATUS_EXAME = ["agendado", "pendente", "realizado", "vencido", "cancelado"] as const;
export type StatusExame = (typeof STATUS_EXAME)[number];

export const STATUS_ACAO = ["pendente", "em_andamento", "concluida", "vencida", "cancelada"] as const;
export type StatusAcao = (typeof STATUS_ACAO)[number];

export const LABEL_STATUS: Record<string, string> = {
  agendado: "Agendado",
  pendente: "Pendente",
  realizado: "Realizado",
  vencido: "Vencido",
  cancelado: "Cancelado",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const CONCLUIDOS = new Set(["realizado", "concluida", "concluído", "concluida"]);
const CANCELADOS = new Set(["cancelado", "cancelada"]);

export function diasAte(data?: string | null): number | null {
  if (!data) return null;
  const dt = new Date(`${data.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((dt.getTime() - hojeUTC) / 86400000);
}

/**
 * Situação de um registro com data prevista/próxima data.
 * - concluído/cancelado têm precedência sobre a data.
 */
export function situacao(
  dataPrevista?: string | null,
  status?: string | null,
  limite = LIMITE_DIAS,
): SituacaoVenc {
  const s = (status ?? "").toLowerCase();
  if (CANCELADOS.has(s)) return "cancelado";
  if (CONCLUIDOS.has(s)) return "concluido";
  const d = diasAte(dataPrevista);
  if (d === null) return "sem_data";
  if (d < 0) return "vencido";
  if (d <= limite) return "a_vencer";
  return "em_dia";
}

export function labelSituacao(s: SituacaoVenc, dias: number | null): string {
  switch (s) {
    case "concluido":
      return "Concluído";
    case "cancelado":
      return "Cancelado";
    case "vencido":
      return `Vencido há ${Math.abs(dias ?? 0)}d`;
    case "a_vencer":
      return `Vence em ${dias}d`;
    case "em_dia":
      return `Em dia (${dias}d)`;
    default:
      return "Sem data";
  }
}

export function variantSituacao(s: SituacaoVenc): "success" | "warning" | "destructive" | "muted" {
  if (s === "vencido") return "destructive";
  if (s === "a_vencer") return "warning";
  if (s === "concluido" || s === "em_dia") return "success";
  return "muted";
}

export function isPendencia(s: SituacaoVenc): boolean {
  return s === "vencido" || s === "a_vencer";
}

export function moeda(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function addMeses(data: string, meses: number): string {
  const d = new Date(`${data.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}
