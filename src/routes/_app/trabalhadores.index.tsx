import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { parseDateToISO } from "@/lib/date-parse";
import { CsvImportButtons } from "@/components/CsvImportButtons";

export const Route = createFileRoute("/_app/trabalhadores/")({
  component: TrabalhadoresPage,
  head: () => ({
    meta: [
      { title: "Pacientes | Vitta SST" },
      { name: "description", content: "Controle de pacientes (funcionários das empresas clientes): exames, CBO, função, setor e situação." },
      { property: "og:title", content: "Pacientes | Vitta SST" },
      { property: "og:description", content: "Controle de pacientes das empresas clientes da Vitta SST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const REGISTROS = ["Ativo", "Contratando", "Encostado", "Desligado", "Sem Registro", "Licença Maternidade", "Preso"];
const TIPOS_EXAME = ["Admissional", "Periódico", "Demissional", "Mud. Função", "Ret. Trab.", "Não faz"];
const STATUS_EXAME = ["Em dia", "A vencer", "Vencido", "Desnecessário"];

type Trabalhador = {
  id: string;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  funcao: string | null;
  cbo: string | null;
  setor: string | null;
  empresa_id: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  registro: string;
  ultimo_exame_data: string | null;
  ultimo_exame_tipo: string | null;
  proximo_exame_data: string | null;
  status_exame: string;
};

function statusVariant(s: string) {
  if (s === "Vencido") return "destructive" as const;
  if (s === "A vencer") return "secondary" as const;
  return "default" as const;
}

function TrabalhadoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState<string>("todos");
  const [registroFilter, setRegistroFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trabalhador | null>(null);

  const { data: trabs = [] } = useQuery({
    queryKey: ["trabalhadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhadores")
        .select("*, empresas(nome)")
        .order("nome");
      if (error) throw error;
      return data as (Trabalhador & { empresas: { nome: string } | null })[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const filtered = trabs.filter((t) => {
    if (empresaFilter !== "todos" && t.empresa_id !== empresaFilter) return false;
    if (registroFilter !== "todos" && (t.registro ?? "Ativo") !== registroFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.nome.toLowerCase().includes(q) || (t.cpf ?? "").includes(search);
    }
    return true;
  });

  const saveMut = useMutation({
    mutationFn: async (form: Partial<Trabalhador>) => {
      const payload: Record<string, unknown> = { ...form };
      delete payload["empresas"];
      if (payload.empresa_id === "" || payload.empresa_id === "nenhuma") payload.empresa_id = null;
      for (const k of ["data_nascimento", "data_admissao", "data_demissao", "ultimo_exame_data", "proximo_exame_data"]) {
        if (payload[k] === "") payload[k] = null;
      }
      if (editing) {
        const { error } = await supabase.from("trabalhadores").update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trabalhadores").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Paciente atualizado" : "Paciente criado");
      qc.invalidateQueries({ queryKey: ["trabalhadores"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trabalhadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["trabalhadores"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Funcionários das empresas clientes: exames, função/CBO, setor e situação."
        actions={
          <div className="flex flex-wrap gap-2">
          <CsvImportButtons
            modeloNome="modelo-pacientes-vitta.csv"
            headers={["nome", "cpf", "empresa", "registro", "data_nascimento", "cbo", "funcao", "setor", "data_admissao", "data_demissao", "ultimo_exame_data", "ultimo_exame_tipo", "proximo_exame_data", "status_exame", "telefone", "email"]}
            exemplo={[["Maria da Silva", "111.222.333-44", "X Prime", "Ativo", "23/09/1998", "2521-05", "Analista", "Comercial", "01/02/2024", "", "21/09/2025", "Periódico", "21/09/2026", "Em dia", "5547999990000", "maria@email.com"]]}
            onRows={async (rows) => {
              const porNome = new Map(empresas.map((e) => [e.nome.trim().toLowerCase(), e.id]));
              const semEmpresa = new Set<string>();
              const payload = rows
                .filter((r) => r.nome?.trim())
                .map((r) => {
                  const emp = r.empresa?.trim();
                  const empresa_id = emp ? porNome.get(emp.toLowerCase()) ?? null : null;
                  if (emp && !empresa_id) semEmpresa.add(emp);
                  const opt = (v: string | undefined, list: string[], def: string) =>
                    list.find((x) => x.toLowerCase() === (v ?? "").trim().toLowerCase()) ?? def;
                  return {
                    nome: r.nome.trim(),
                    cpf: r.cpf || null,
                    empresa_id,
                    registro: opt(r.registro, REGISTROS, "Ativo"),
                    data_nascimento: parseDateToISO(r.data_nascimento),
                    cbo: r.cbo || null,
                    funcao: r.funcao || null,
                    setor: r.setor || null,
                    data_admissao: parseDateToISO(r.data_admissao),
                    data_demissao: parseDateToISO(r.data_demissao),
                    ultimo_exame_data: parseDateToISO(r.ultimo_exame_data),
                    ultimo_exame_tipo: r.ultimo_exame_tipo ? opt(r.ultimo_exame_tipo, TIPOS_EXAME, r.ultimo_exame_tipo) : null,
                    proximo_exame_data: parseDateToISO(r.proximo_exame_data),
                    status_exame: opt(r.status_exame, STATUS_EXAME, "Em dia"),
                    telefone: r.telefone || null,
                    email: r.email || null,
                  };
                });
              if (!payload.length) return void toast.error("Nenhum paciente válido no arquivo");
              const { error } = await supabase.from("trabalhadores").insert(payload as never);
              if (error) throw error;
              toast.success(`${payload.length} paciente(s) importado(s)`);
              if (semEmpresa.size) toast.warning(`Empresas não encontradas (ficaram sem vínculo): ${[...semEmpresa].join(", ")}`);
              qc.invalidateQueries({ queryKey: ["trabalhadores"] });
            }}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4 mr-2" /> Novo paciente
              </Button>
            </DialogTrigger>
            <TrabForm
              key={editing?.id ?? "novo"}
              editing={editing}
              empresas={empresas}
              onSubmit={(d) => saveMut.mutate(d)}
              busy={saveMut.isPending}
            />
          </Dialog>
          </div>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome ou CPF"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={registroFilter} onValueChange={setRegistroFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os registros</SelectItem>
            {REGISTROS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} paciente(s)</div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registro</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>CBO</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Últ. exame</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.registro ?? "Ativo"}</TableCell>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{t.cpf || "—"}</TableCell>
                <TableCell>{t.cbo || "—"}</TableCell>
                <TableCell>{t.funcao || "—"}</TableCell>
                <TableCell>{t.setor || "—"}</TableCell>
                <TableCell>{t.empresas?.nome || "—"}</TableCell>
                <TableCell>{fmtDate(t.ultimo_exame_data)}</TableCell>
                <TableCell>{fmtDate(t.proximo_exame_data)}</TableCell>
                <TableCell>{t.ultimo_exame_tipo || "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(t.status_exame ?? "Em dia")}>{t.status_exame ?? "Em dia"}</Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" asChild>
                    <Link to="/trabalhadores/$id" params={{ id: t.id }}><Eye className="size-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(t.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  Nenhum paciente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TrabForm({
  editing,
  empresas,
  onSubmit,
  busy,
}: {
  editing: Trabalhador | null;
  empresas: { id: string; nome: string }[];
  onSubmit: (d: Partial<Trabalhador>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<Trabalhador>>(
    editing ?? { nome: "", ativo: true, registro: "Ativo", status_exame: "Em dia" },
  );
  const set = (k: keyof Trabalhador, v: unknown) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Registro</Label>
            <Select value={form.registro ?? "Ativo"} onValueChange={(v) => set("registro", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGISTROS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Paciente *</Label>
            <Input required value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <Input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento</Label>
            <Input type="date" value={form.data_nascimento ?? ""} onChange={(e) => set("data_nascimento", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CBO</Label>
            <Input placeholder="0000-00" value={form.cbo ?? ""} onChange={(e) => set("cbo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Função</Label>
            <Input value={form.funcao ?? ""} onChange={(e) => set("funcao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Setor</Label>
            <Input value={form.setor ?? ""} onChange={(e) => set("setor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa (cliente)</Label>
            <Select
              value={form.empresa_id ?? "nenhuma"}
              onValueChange={(v) => set("empresa_id", v === "nenhuma" ? null : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">— Nenhuma —</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de admissão</Label>
            <Input type="date" value={form.data_admissao ?? ""} onChange={(e) => set("data_admissao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de demissão</Label>
            <Input type="date" value={form.data_demissao ?? ""} onChange={(e) => set("data_demissao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Último exame realizado</Label>
            <Input type="date" value={form.ultimo_exame_data ?? ""} onChange={(e) => set("ultimo_exame_data", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo do último exame</Label>
            <Select value={form.ultimo_exame_tipo ?? "nenhum"} onValueChange={(v) => set("ultimo_exame_tipo", v === "nenhum" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">— Nenhum —</SelectItem>
                {TIPOS_EXAME.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Previsão do próximo exame</Label>
            <Input type="date" value={form.proximo_exame_data ?? ""} onChange={(e) => set("proximo_exame_data", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status_exame ?? "Em dia"} onValueChange={(v) => set("status_exame", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_EXAME.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
