import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { diasAte, labelSituacao, situacao, variantSituacao, LABEL_STATUS } from "@/lib/status";

export function SituacaoBadge({
  date,
  status,
}: {
  date?: string | null;
  status?: string | null;
}) {
  const s = situacao(date, status);
  const v = variantSituacao(s);
  return (
    <Badge
      className={cn(
        "font-medium",
        v === "success" && "bg-success text-success-foreground hover:bg-success/90",
        v === "warning" && "bg-warning text-warning-foreground hover:bg-warning/90",
        v === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        v === "muted" && "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {labelSituacao(s, diasAte(date))}
    </Badge>
  );
}

export function StatusChip({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  const label = LABEL_STATUS[s] ?? status ?? "—";
  return (
    <Badge
      className={cn(
        "font-medium",
        (s === "realizado" || s === "concluida") && "bg-success text-success-foreground hover:bg-success/90",
        (s === "vencido" || s === "vencida") && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        (s === "pendente" || s === "agendado" || s === "em_andamento") &&
          "bg-warning text-warning-foreground hover:bg-warning/90",
        (s === "cancelado" || s === "cancelada") && "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {label}
    </Badge>
  );
}
