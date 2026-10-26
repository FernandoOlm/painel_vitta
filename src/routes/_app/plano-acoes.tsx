import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CheckCircle2, Ban } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { SituacaoBadge, StatusChip } from "@/components/StatusBadge";
import { isPendencia, situacao } from "@/lib/status";

export const Route = createFileRoute("/_app/plano-acoes")({
  component: PlanoAcoesPage,
  head: () => ({
    meta: [
      { title: "Plano de Ações | Vitta SST" },
      {
        name: "description",
        content: "Treinamentos, ordens de serviço, fichas de EPI, integrações e inspeções por paciente e empresa.",
      },
      { property: "og:title", content: "Plano de Ações | Vitta SST" },
      { property: "og:description", content: "Gestão das ações operacionais de SST da Vitta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

export const TIPOS_ACAO = [
  "Treinamento",
  "Ordem de Serviço",
  "Ficha de EPI",
  "Integração",
  "Inspeção",
  "Outra",
];

const STATUS = ["pendente", "em_andamento", "concluida", "vencida", "cancelada"];

export type PlanoAcao = {
  id: string;
  titulo: string;
  tipo_acao: string;
  descricao: string | null;
  trabalhador_id: string | null;
  empresa_id: string | null;
  data_abertura: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  status: string;
  observacoes: string | null;
  trabalhadores?: { nome: string } | null;
  empresas?: { nome: string } | null;
};

function PlanoAcoesPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fEmpresa, setFEmpresa] = useState("todas");
  const [fPaciente, setFPaciente] = useState("todos");
  const [fVenc, setFVenc] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoAcao | null>(null);
  const [toDelete, setToDelete] = useState<PlanoAcao | null>(null);

  const { data: acoes = [], isLoading, error } = useQuery({
    queryKey: ["planos-acao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_acao")
        .select("*, trabalhadores(nome), empresas(nome)")
        .order("data_prevista", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as PlanoAcao[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("trabalhadores").select("id, nome, empresa_id").order("nome");
      return (data ?? []) as { id: string; nome: string; empresa_id: string | null }[];
    },
  });

  const filtradas = useMemo(
    () =>
      acoes.filter((a) => {
        if (busca && !a.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
        if (fTipo !== "todos" && a.tipo_acao !== fTipo) return false;
        if (fStatus !== "todos" && a.status !== fStatus) return false;
        if (fEmpresa !== "todas" && a.empresa_id !== fEmpresa) return false;
        if (fPaciente !== "todos" && a.trabalhador_id !== fPaciente) return false;
        if (de && (a.data_prevista ?? "") < de) return false;
        if (ate && (a.data_prevista ?? "9999") > ate) return false;
        if (fVenc !== "todos") {
          const s = situacao(a.data_prevista, a.status);
          if (fVenc === "vencidas" && s !== "vencido") return false;
          if (fVenc === "a_vencer" && s !== "a_vencer") return false;
          if (fVenc === "pendencias" && !isPendencia(s)) return false;
        }
        return true;
      }),
    [acoes, busca, fTipo, fStatus, fEmpresa, fPaciente, fVenc, de, ate],
  );

  const resumo = useMemo(() => {
    let vencidas = 0;
    let aVencer = 0;
    let concluidas = 0;
    filtradas.forEach((a) => {
      const s = situacao(a.data_prevista, a.status);
      if (s === "vencido") vencidas++;
      if (s === "a_vencer") aVencer++;
      if (s === "concluido") concluidas++;
    });
    return { total: filtradas.length, vencidas, aVencer, concluidas };
  }, [filtradas]);

  const saveMut = useMutation({
    mutationFn: async (form: Partial<PlanoAcao>) => {
      if (!form.titulo?.trim()) throw new Error("Informe o título da ação.");
      if (!form.trabalhador_id) throw new Error("Selecione o paciente vinculado.");
      const paciente = pacientes.find((p) => p.id === form.trabalhador_id);
      const payload = {
        titulo: form.titulo.trim(),
        tipo_acao: form.tipo_acao ?? "Treinamento",
        descricao: form.descricao || null,
        trabalhador_id: form.trabalhador_id,
        empresa_id: form.empresa_id ?? paciente?.empresa_id ?? null,
        data_abertura: form.data_abertura || new Date().toISOString().slice(0, 10),
        data_prevista: form.data_prevista || null,
        data_conclusao: form.data_conclusao || null,
        status: form.status ?? "pendente",
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("planos_acao").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planos_acao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Ação atualizada" : "Ação cadastrada");
      qc.invalidateQueries({ queryKey: ["planos-acao"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch = {
        status,
        ...(status === "concluida" ? { data_conclusao: new Date().toISOString().slice(0, 10) } : {}),
      };
      const { error } = await supabase.from("planos_acao").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação atualizada");
      qc.invalidateQueries({ queryKey: ["planos-acao"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planos_acao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação removida");
      qc.invalidateQueries({ queryKey: ["planos-acao"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Plano de Ações"
        description="Treinamentos, ordens de serviço, fichas de EPI, integrações e inspeções vinculadas aos pacientes."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4 mr-2" /> Nova ação
              </Button>
            </DialogTrigger>
            <AcaoForm
              key={editing?.id ?? "nova"}
              editing={editing}
              empresas={empresas}
              pacientes={pacientes}
              onSubmit={(d) => saveMut.mutate(d)}
              busy={saveMut.isPending}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ações (filtro)</div>
          <div className="text-2xl font-display font-bold">{resumo.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Vencidas</div>
          <div className="text-2xl font-display font-bold text-destructive">{resumo.vencidas}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Vencendo em 30 dias</div>
          <div className="text-2xl font-display font-bold text-warning">{resumo.aVencer}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Concluídas</div>
          <div className="text-2xl font-display font-bold text-success">{resumo.concluidas}</div>
        </Card>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por título"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={fTipo} onValueChange={setFTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_ACAO.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "em_andamento" ? "Em andamento" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fEmpresa} onValueChange={setFEmpresa}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fPaciente} onValueChange={setFPaciente}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os pacientes</SelectItem>
            {pacientes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fVenc} onValueChange={setFVenc}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Qualquer vencimento</SelectItem>
            <SelectItem value="pendencias">Pendências (30 dias)</SelectItem>
            <SelectItem value="vencidas">Vencidas</SelectItem>
            <SelectItem value="a_vencer">A vencer</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Período previsto</Label>
          <Input type="date" className="w-40" value={de} onChange={(e) => setDe(e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <Input type="date" className="w-40" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Prevista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-destructive py-8">
                  Não foi possível carregar as ações.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              filtradas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.titulo}
                    {a.descricao && <div className="text-xs text-muted-foreground line-clamp-1">{a.descricao}</div>}
                  </TableCell>
                  <TableCell>{a.tipo_acao}</TableCell>
                  <TableCell>
                    {a.trabalhador_id ? (
                      <Link
                        to="/trabalhadores/$id"
                        params={{ id: a.trabalhador_id }}
                        className="text-primary hover:underline"
                      >
                        {a.trabalhadores?.nome ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{a.empresas?.nome ?? "—"}</TableCell>
                  <TableCell>{fmtDate(a.data_prevista)}</TableCell>
                  <TableCell>
                    <StatusChip status={a.status} />
                  </TableCell>
                  <TableCell>
                    <SituacaoBadge date={a.data_prevista} status={a.status} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Concluir"
                      disabled={a.status === "concluida"}
                      onClick={() => statusMut.mutate({ id: a.id, status: "concluida" })}
                    >
                      <CheckCircle2 className="size-4 text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Cancelar"
                      disabled={a.status === "cancelada"}
                      onClick={() => statusMut.mutate({ id: a.id, status: "cancelada" })}
                    >
                      <Ban className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete(a)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && !error && !filtradas.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma ação encontrada com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && delMut.mutate(toDelete.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AcaoForm({
  editing,
  empresas,
  pacientes,
  pacienteFixo,
  onSubmit,
  busy,
}: {
  editing: PlanoAcao | null;
  empresas: { id: string; nome: string }[];
  pacientes: { id: string; nome: string; empresa_id: string | null }[];
  pacienteFixo?: string;
  onSubmit: (d: Partial<PlanoAcao>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<PlanoAcao>>(
    editing ?? {
      titulo: "",
      tipo_acao: "Treinamento",
      status: "pendente",
      trabalhador_id: pacienteFixo ?? null,
      empresa_id: pacientes.find((p) => p.id === pacienteFixo)?.empresa_id ?? null,
      data_abertura: new Date().toISOString().slice(0, 10),
    },
  );
  const set = (k: keyof PlanoAcao, v: unknown) => setForm({ ...form, [k]: v });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar ação" : "Nova ação"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input required value={form.titulo ?? ""} onChange={(e) => set("titulo", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo de ação *</Label>
            <Select value={form.tipo_acao ?? "Treinamento"} onValueChange={(v) => set("tipo_acao", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ACAO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status ?? "pendente"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "em_andamento" ? "Em andamento" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!pacienteFixo && (
            <>
              <div className="space-y-1.5">
                <Label>Paciente *</Label>
                <Select
                  value={form.trabalhador_id ?? ""}
                  onValueChange={(v) => {
                    const p = pacientes.find((x) => x.id === v);
                    setForm({ ...form, trabalhador_id: v, empresa_id: p?.empresa_id ?? null });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Empresa (do paciente)</Label>
                <Input
                  readOnly
                  value={empresas.find((e) => e.id === form.empresa_id)?.nome ?? "—"}
                  className="bg-muted"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>Data de abertura</Label>
            <Input
              type="date"
              value={form.data_abertura ?? ""}
              onChange={(e) => set("data_abertura", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input
              type="date"
              value={form.data_prevista ?? ""}
              onChange={(e) => set("data_prevista", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data de conclusão</Label>
            <Input
              type="date"
              value={form.data_conclusao ?? ""}
              onChange={(e) => set("data_conclusao", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
