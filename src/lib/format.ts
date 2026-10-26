export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((dt.getTime() - today.getTime()) / 86400000);
}

export function venceStatus(d?: string | null): {
  label: string;
  variant: "success" | "warning" | "destructive" | "muted";
} {
  const days = daysUntil(d);
  if (days === null) return { label: "Sem data", variant: "muted" };
  if (days < 0) return { label: `Vencido há ${Math.abs(days)}d`, variant: "destructive" };
  if (days <= 30) return { label: `Vence em ${days}d`, variant: "warning" };
  return { label: `Em dia (${days}d)`, variant: "success" };
}

export function waLink(phone?: string | null, msg = ""): string {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export function mailtoLink(email?: string | null, subject = "", body = ""): string {
  if (!email) return "#";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${email}${qs ? `?${qs}` : ""}`;
}
