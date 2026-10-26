import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  empresa: z.string().uuid().optional(),
  trabalhador: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_app/laudos/novo")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NovoLaudoPage,
});

type Tipo = "PCMSO" | "PGR" | "LTCAT" | "PPP" | "AVCB" | "outro";

function NovoLaudoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [form, setForm] = useState({
    tipo: "PCMSO" as Tipo,
    titulo: "",
    data_emissao: "",
    data_vencimento: "",
    empresa_id: search.empresa ?? "",
    trabalhador_id: search.trabalhador ?? "",
    arquivo_url: "",
    observacoes: "",
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () =>
      (await supabase.from("empresas").select("id, nome").order("nome")).data ?? [],
  });
  const { data: trabs = [] } = useQuery({
    queryKey: ["trabs-select"],
    queryFn: async () =>
      (await supabase.from("trabalhadores").select("id, nome").order("nome")).data ?? [],
  });

  const empresaSel = empresas.find((e) => e.id === form.empresa_id);

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        data_emissao: form.data_emissao || null,
        data_vencimento: form.data_vencimento || null,
        empresa_id: form.empresa_id || null,
        trabalhador_id: form.trabalhador_id || null,
        arquivo_url: form.arquivo_url.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      const { error } = await supabase.from("laudos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laudo criado");
      navigate({ to: "/laudos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Novo laudo"
        description="Cadastre um novo laudo e vincule a uma empresa ou trabalhador."
        actions={
          <Button variant="outline" asChild>
            <Link to="/laudos">
              <ArrowLeft className="size-4 mr-2" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.titulo.trim()) {
                  toast.error("Informe o título");
                  return;
                }
                createMut.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["PCMSO", "PGR", "LTCAT", "PPP", "AVCB", "outro"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Título *</Label>
                  <Input
                    required
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ex.: PCMSO 2026 - Empresa X"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de emissão</Label>
                  <Input
                    type="date"
                    value={form.data_emissao}
                    onChange={(e) => setForm({ ...form, data_emissao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa vinculada</Label>
                  <Select
                    value={form.empresa_id || "nenhuma"}
                    onValueChange={(v) => setForm({ ...form, empresa_id: v === "nenhuma" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">— Nenhuma —</SelectItem>
                      {empresas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Trabalhador vinculado</Label>
                  <Select
                    value={form.trabalhador_id || "nenhum"}
                    onValueChange={(v) => setForm({ ...form, trabalhador_id: v === "nenhum" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">— Nenhum —</SelectItem>
                      {trabs.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>URL do arquivo (PDF)</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={form.arquivo_url}
                    onChange={(e) => setForm({ ...form, arquivo_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Salvando..." : "Criar laudo"}
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link to="/laudos">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-3">
              <div className="size-9 rounded-md bg-primary/10 grid place-items-center shrink-0">
                <FileText className="size-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Vínculo com empresa</div>
                <p className="text-xs text-muted-foreground">
                  {empresaSel
                    ? `Este laudo ficará vinculado à empresa "${empresaSel.nome}" e aparecerá em seus registros.`
                    : "Selecione uma empresa para associar o laudo ao seu histórico. Você também pode vincular a um trabalhador específico."}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>PCMSO</strong> — Programa de Controle Médico</div>
              <div><strong>PGR</strong> — Programa de Gerenciamento de Riscos</div>
              <div><strong>LTCAT</strong> — Laudo Técnico de Condições Ambientais</div>
              <div><strong>PPP</strong> — Perfil Profissiográfico Previdenciário</div>
              <div><strong>AVCB</strong> — Auto de Vistoria do Corpo de Bombeiros</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
