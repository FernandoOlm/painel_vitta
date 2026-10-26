import { Badge } from "@/components/ui/badge";
import { venceStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VencimentoBadge({ date }: { date?: string | null }) {
  const s = venceStatus(date);
  return (
    <Badge
      className={cn(
        "font-medium",
        s.variant === "success" && "bg-success text-success-foreground hover:bg-success/90",
        s.variant === "warning" && "bg-warning text-warning-foreground hover:bg-warning/90",
        s.variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        s.variant === "muted" && "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {s.label}
    </Badge>
  );
}
