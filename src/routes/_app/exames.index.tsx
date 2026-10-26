import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { SituacaoBadge, StatusChip } from "@/components/StatusBadge";
import { isPendencia, moeda, situacao } from "@/lib/status";
import { ExameForm, expandItens, type Exame, type TipoExameOpt } from "@/components/ExameForm";

export const Route = createFileRoute("/_app/exames/")({
  component: ExamesPage,
  head: () => ({
    meta: [
      { title: "Exames | Vitta SST" },
      {
        name: "description",
        content:
          "Exames ocupacionais vinculados a pacientes e empresas: valor aplicado, data de realização, próxima data e situação.",
      },
      { property: "og:title", content: "Exames | Vitta SST" },
      { property: "og:description", content: "Controle operacional dos exames ocupacionais da Vitta SST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ExamesPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [fEmpresa, setFEmpresa] = useState("todas");
  const [fPaciente, setFPaciente] = useState("todos");
  const [fTipoExame, setFTipoExame] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fVenc, setFVenc] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exame | null>(null);
  const [toDelete, setToDelete] = useState<Exame | null>(null);

  const { data: exames = [], isLoading, error } = useQuery({
    queryKey: ["exames"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exames")
        .select("*, trabalhadores(nome, cpf), empresas(nome), tipos_exame(nome, categoria)")
        .order("proxima_data", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as Exame[];
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

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-exame-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("tipos_exame").select("*").order("nome");
      return (data ?? []) as TipoExameOpt[];
    },
  });

  const filtrados = useMemo(
    () =>
      exames.filter((e) => {
        if (fEmpresa !== "todas" && e.empresa_id !== fEmpresa) return false;
        if (fPaciente !== "todos" && e.trabalhador_id !== fPaciente) return false;
        if (fTipoExame !== "todos" && e.tipo_exame_id !== fTipoExame) return false;
        if (fStatus !== "todos" && e.status !== fStatus) return false;
        const ref = e.proxima_data ?? e.data;
        if (de && (ref ?? "") < de) return false;
        if (ate && (ref ?? "9999") > ate) return false;
        if (fVenc !== "todos") {
          const s = situacao(e.proxima_data, e.status);
          if (fVenc === "vencidos" && s !== "vencido") return false;
          if (fVenc === "a_vencer" && s !== "a_vencer") return false;
          if (fVenc === "pendencias" && !isPendencia(s)) return false;
        }
        if (busca) {
          const q = busca.toLowerCase();
          return (
            (e.trabalhadores?.nome ?? "").toLowerCase().includes(q) ||
            (e.empresas?.nome ?? "").toLowerCase().includes(q) ||
            (e.tipos_exame?.nome ?? "").toLowerCase().includes(q) ||
            (e.trabalhadores?.cpf ?? "").includes(busca)
          );
        }
        return true;
      }),
    [exames, busca, fEmpresa, fPaciente, fTipoExame, fStatus, fVenc, de, ate],
  );

  const resumo = useMemo(() => {
    let vencidos = 0;
    let aVencer = 0;
    let soma = 0;
    const porTipo = new Map<string, number>();
    filtrados.forEach((e) => {
      const s = situacao(e.proxima_data, e.status);
      if (s === "vencido") vencidos++;
      if (s === "a_vencer") aVencer++;
      soma += Number(e.valor ?? e.fatura ?? 0);
      const nome = e.tipos_exame?.nome ?? e.tipo ?? "Sem tipo";
      porTipo.set(nome, (porTipo.get(nome) ?? 0) + 1);
    });
    return {
      total: filtrados.length,
      vencidos,
      aVencer,
      soma,
      porTipo: [...porTipo.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [filtrados]);

  const saveMut = useMutation({
    mutationFn: async (form: Partial<Exame>) => {
      const num = (v: unknown) => (v === "" || v == null ? null : Number(v));
      const payload = {
        trabalhador_id: form.trabalhador_id || null,
        empresa_id: form.empresa_id || null,
        tipo_exame_id: form.tipo_exame_id || null,
        tipo: form.tipo ?? "Periódico",
        status: form.status ?? "pendente",
        clinica: form.clinica || null,
        registro: form.registro || null,
        data: form.data || null,
        proxima_data: form.proxima_data || null,
        periodicidade_meses: num(form.periodicidade_meses),
        horario: form.horario || null,
        esocial: form.esocial || null,
        kit: form.kit || null,
        observacoes: form.observacoes || null,
        valor: num(form.valor),
        fatura: num(form.fatura),
        custo: num(form.custo),
        lucro: num(form.lucro),
        valor_clinica: num(form.valor_clinica),
        valor_laboratorio: num(form.valor_laboratorio),
      };
      if (!payload.trabalhador_id) throw new Error("Selecione o paciente.");
      if (editing) {
        const { error } = await supabase.from("exames").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exames").insert(expandItens(form, payload));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Exame atualizado" : "Exame vinculado");
      qc.invalidateQueries({ queryKey: ["exames"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exames").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exame removido");
      qc.invalidateQueries({ queryKey: ["exames"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Exames"
        description="Exames vinculados aos pacientes, com valor aplicado, data de realização, próxima data e situação."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/exames/catalogo">
                <ListChecks className="size-4 mr-2" /> Catálogo
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="size-4 mr-2" /> Novo exame
                </Button>
              </DialogTrigger>
              <ExameForm
                key={editing?.id ?? "novo"}
                editing={editing}
                empresas={empresas}
                pacientes={pacientes}
                tipos={tipos}
                onSubmit={(d) => saveMut.mutate(d)}
                busy={saveMut.isPending}
              />
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Exames (filtro)</div>
          <div className="text-2xl font-display font-bold">{resumo.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Vencidos</div>
          <div className="text-2xl font-display font-bold text-destructive">{resumo.vencidos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Vencendo em 30 dias</div>
          <div className="text-2xl font-display font-bold text-warning">{resumo.aVencer}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Soma dos valores</div>
          <div className="text-2xl font-display font-bold">{moeda(resumo.soma)}</div>
        </Card>
      </div>

      {resumo.porTipo.length > 0 && (
        <Card className="p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Quantidade por tipo de exame (filtro aplicado)</div>
          <div className="flex flex-wrap gap-2">
            {resumo.porTipo.map(([nome, qtd]) => (
              <span key={nome} className="text-sm rounded-md bg-accent px-2.5 py-1">
                {nome}: <strong>{qtd}</strong>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por paciente, CPF, empresa ou exame"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
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
        <Select value={fTipoExame} onValueChange={setFTipoExame}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os exames</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
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
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fVenc} onValueChange={setFVenc}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Qualquer vencimento</SelectItem>
            <SelectItem value="pendencias">Pendências (30 dias)</SelectItem>
            <SelectItem value="vencidos">Vencidos</SelectItem>
            <SelectItem value="a_vencer">A vencer</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Input type="date" className="w-40" value={de} onChange={(e) => setDe(e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <Input type="date" className="w-40" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Exame</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Realização</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-destructive py-8">
                  Não foi possível carregar os exames.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              filtrados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.trabalhador_id ? (
                      <Link
                        to="/trabalhadores/$id"
                        params={{ id: e.trabalhador_id }}
                        className="text-primary hover:underline"
                      >
                        {e.trabalhadores?.nome ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{e.empresas?.nome ?? "—"}</TableCell>
                  <TableCell>
                    {e.tipos_exame?.nome ?? "—"}
                    <div className="text-xs text-muted-foreground">{e.tipo}</div>
                  </TableCell>
                  <TableCell>{moeda(e.valor ?? e.fatura)}</TableCell>
                  <TableCell>{fmtDate(e.data)}</TableCell>
                  <TableCell>{fmtDate(e.proxima_data)}</TableCell>
                  <TableCell>
                    <StatusChip status={e.status} />
                  </TableCell>
                  <TableCell>
                    <SituacaoBadge date={e.proxima_data} status={e.status} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete(e)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && !error && !filtrados.length && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum exame encontrado com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este exame?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico deste vínculo será perdido. Se o exame já foi realizado, prefira mantê-lo e alterar o status.
            </AlertDialogDescription>
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
