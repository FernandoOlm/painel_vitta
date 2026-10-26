import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { moeda } from "@/lib/status";

export const Route = createFileRoute("/_app/exames/catalogo")({
  component: CatalogoPage,
  head: () => ({
    meta: [
      { title: "Catálogo de exames | Vitta SST" },
      {
        name: "description",
        content: "Cadastro dos tipos de exames ocupacionais: valor padrão, periodicidade e situação ativo/inativo.",
      },
      { property: "og:title", content: "Catálogo de exames | Vitta SST" },
      { property: "og:description", content: "Cadastro dos tipos de exames ocupacionais da Vitta SST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type TipoExame = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  valor_padrao: number;
  periodicidade_meses: number | null;
  ativo: boolean;
};

function CatalogoPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fCategoria, setFCategoria] = useState("todas");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TipoExame | null>(null);
  const [toDelete, setToDelete] = useState<TipoExame | null>(null);

  const { data: tipos = [], isLoading, error } = useQuery({
    queryKey: ["tipos-exame"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_exame").select("*").order("nome");
      if (error) throw error;
      return data as TipoExame[];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["tipos-exame-em-uso"],
    queryFn: async () => {
      const { data } = await supabase.from("exames").select("tipo_exame_id").not("tipo_exame_id", "is", null);
      return (data ?? []).map((r) => r.tipo_exame_id as string);
    },
  });
  const emUso = useMemo(() => new Set(vinculos), [vinculos]);

  const categorias = useMemo(
    () => [...new Set(tipos.map((t) => t.categoria).filter(Boolean) as string[])].sort(),
    [tipos],
  );

  const filtrados = tipos.filter((t) => {
    if (busca && !t.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (fStatus === "ativos" && !t.ativo) return false;
    if (fStatus === "inativos" && t.ativo) return false;
    if (fCategoria !== "todas" && t.categoria !== fCategoria) return false;
    return true;
  });

  const saveMut = useMutation({
    mutationFn: async (form: Partial<TipoExame>) => {
      const payload = {
        nome: (form.nome ?? "").trim(),
        descricao: form.descricao || null,
        categoria: form.categoria || null,
        valor_padrao: Number(form.valor_padrao ?? 0),
        periodicidade_meses:
          form.periodicidade_meses == null || (form.periodicidade_meses as unknown as string) === ""
            ? null
            : Number(form.periodicidade_meses),
        ativo: form.ativo ?? true,
      };
      if (!payload.nome) throw new Error("Informe o nome do exame.");
      if (editing) {
        const { error } = await supabase.from("tipos_exame").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tipos_exame").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Exame atualizado" : "Exame cadastrado");
      qc.invalidateQueries({ queryKey: ["tipos-exame"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async (t: TipoExame) => {
      const { error } = await supabase.from("tipos_exame").update({ ativo: !t.ativo }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação alterada");
      qc.invalidateQueries({ queryKey: ["tipos-exame"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (t: TipoExame) => {
      const { error } = await supabase.from("tipos_exame").delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exame excluído do catálogo");
      qc.invalidateQueries({ queryKey: ["tipos-exame"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Catálogo de exames"
        description="Tipos de exames disponíveis, com valor padrão e periodicidade. O valor aplicado a cada paciente é guardado no vínculo e não muda quando este cadastro é alterado."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4 mr-2" /> Novo exame
              </Button>
            </DialogTrigger>
            <TipoForm
              key={editing?.id ?? "novo"}
              editing={editing}
              onSubmit={(d) => saveMut.mutate(d)}
              busy={saveMut.isPending}
            />
          </Dialog>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            <SelectItem value="ativos">Somente ativos</SelectItem>
            <SelectItem value="inativos">Somente inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fCategoria} onValueChange={setFCategoria}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os tipos</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor padrão</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive py-8">
                  Não foi possível carregar o catálogo.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              filtrados.map((t) => (
                <TableRow key={t.id} className={t.ativo ? "" : "opacity-60"}>
                  <TableCell className="font-medium">
                    {t.nome}
                    {t.descricao && <div className="text-xs text-muted-foreground">{t.descricao}</div>}
                  </TableCell>
                  <TableCell>{t.categoria || "—"}</TableCell>
                  <TableCell>{moeda(t.valor_padrao)}</TableCell>
                  <TableCell>{t.periodicidade_meses ? `${t.periodicidade_meses} meses` : "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        t.ativo
                          ? "bg-success text-success-foreground hover:bg-success/90"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }
                    >
                      {t.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t.ativo ? "Inativar" : "Ativar"}
                      onClick={() => toggleMut.mutate(t)}
                    >
                      <Power className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={emUso.has(t.id) ? "Em uso: apenas inativação" : "Excluir"}
                      disabled={emUso.has(t.id)}
                      onClick={() => setToDelete(t)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && !error && !filtrados.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum exame no catálogo com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Exames já vinculados a pacientes não podem ser excluídos — apenas
              inativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && delMut.mutate(toDelete)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TipoForm({
  editing,
  onSubmit,
  busy,
}: {
  editing: TipoExame | null;
  onSubmit: (d: Partial<TipoExame>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<TipoExame>>(
    editing ?? { nome: "", valor_padrao: 0, periodicidade_meses: 12, ativo: true, categoria: "Clínico" },
  );
  const set = (k: keyof TipoExame, v: unknown) => setForm({ ...form, [k]: v });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar exame do catálogo" : "Novo exame do catálogo"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label>Nome do exame *</Label>
          <Input required value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Input
              placeholder="Clínico, Complementar..."
              value={form.categoria ?? ""}
              onChange={(e) => set("categoria", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valor padrão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_padrao ?? 0}
              onChange={(e) => set("valor_padrao", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Periodicidade (meses)</Label>
            <Input
              type="number"
              min="0"
              value={form.periodicidade_meses ?? ""}
              onChange={(e) => set("periodicidade_meses", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={form.ativo === false ? "inativo" : "ativo"} onValueChange={(v) => set("ativo", v === "ativo")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descrição / observações</Label>
          <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
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
