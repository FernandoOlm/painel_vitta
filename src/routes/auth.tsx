import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Falha ao entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div
      className="min-h-screen grid lg:grid-cols-2"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="hidden lg:flex flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-white/10 backdrop-blur grid place-items-center font-bold">V</div>
          <div className="font-display font-bold text-lg">Vitta Engenharia SST</div>
        </div>
        <div className="space-y-4 max-w-md">
          <ShieldCheck className="size-12 opacity-80" />
          <h2 className="font-display font-bold text-3xl leading-tight">
            Segurança do trabalho com gestão precisa e humanizada.
          </h2>
          <p className="opacity-80">
            Acompanhe empresas, trabalhadores, laudos e vencimentos em um só lugar.
          </p>
        </div>
        <div className="text-xs opacity-60">© Vitta Engenharia SST</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="size-9 rounded-md bg-primary grid place-items-center font-bold text-primary-foreground">V</div>
            <div className="font-display font-bold">Vitta SST</div>
          </div>
          <h1 className="font-display font-bold text-2xl mb-1">Acesse sua conta</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Use seu e-mail corporativo cadastrado pelo administrador.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Novos acessos são criados pelo administrador do sistema.
          </p>
        </Card>
      </div>
    </div>
  );
}
