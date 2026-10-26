import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { parseDateToISO } from "@/lib/date-parse";
import { CsvImportButtons } from "@/components/CsvImportButtons";

export const Route = createFileRoute("/_app/empresas/")({
  component: EmpresasPage,
  head: () => ({
    meta: [
      { title: "Clientes (Empresas) | Vitta SST" },
      { name: "description", content: "Controle das empresas clientes da Vitta Engenharia SST: vidas, grau de risco, contrato, ART e contatos." },
      { property: "og:title", content: "Clientes (Empresas) | Vitta SST" },
      { property: "og:description", content: "Controle das empresas clientes da Vitta Engenharia SST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Empresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  contato_responsavel: string | null;
  observacoes: string | null;
  vidas: number | null;
  grau_risco: number | null;
  data_entrada: string | null;
  mes_renovacao: string | null;
  tem_contrato: boolean;
  dia_faturamento: number | null;
  venc_art: string | null;
  status: string;
  resp_rh: string | null;
  rh_telefone: string | null;
  rh_email: string | null;
  contabilidade: string | null;
  resp_contador: string | null;
  contador_telefone: string | null;
  contador_email: string | null;
};

function EmpresasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const filtered = data.filter((e) => {
    if (statusFilter !== "todos" && (e.status ?? "Ativo") !== statusFilter) return false;
    return !search ? true : (e.nome + " " + (e.cnpj ?? "")).toLowerCase().includes(search.toLowerCase());
  });

  const totalVidas = filtered.reduce((s, e) => s + (e.vidas ?? 0), 0);

  const saveMut = useMutation({
    mutationFn: async (form: Partial<Empresa>) => {
      const payload: Record<string, unknown> = { ...form };
      for (const k of ["vidas", "grau_risco", "dia_faturamento"]) {
        payload[k] = payload[k] === "" || payload[k] == null ? null : Number(payload[k]);
      }
      for (const k of ["data_entrada", "venc_art"]) {
        if (payload[k] === "") payload[k] = null;
      }
      if (editing) {
        const { error } = await supabase.from("empresas").update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empresas").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("empresas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["empresas"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Clientes (Empresas)"
        description="Controle dos clientes: vidas, grau de risco, contrato, faturamento, ART e contatos de RH/contabilidade."
        actions={
          <div className="flex flex-wrap gap-2">
          <CsvImportButtons
            modeloNome="modelo-clientes-vitta.csv"
            headers={["nome", "cnpj", "razao_social", "vidas", "grau_risco", "data_entrada", "mes_renovacao", "tem_contrato", "dia_faturamento", "venc_art", "status", "resp_rh", "rh_telefone", "rh_email", "contabilidade", "resp_contador", "contador_telefone", "contador_email", "endereco", "cidade", "estado", "cep", "telefone", "observacoes"]}
            exemplo={[["X Prime", "12.345.678/0001-90", "X Prime Ltda", "25", "2", "10/01/2024", "Janeiro", "Sim", "10", "10/01/2027", "Ativo", "Ana", "5547999990000", "rh@xprime.com", "Contab ABC", "Carlos", "5547988880000", "contador@abc.com", "Rua A, 100", "Joinville", "SC", "89200-000", "4733330000", ""]]}
            onRows={async (rows) => {
              const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);
              const payload = rows
                .filter((r) => r.nome?.trim())
                .map((r) => ({
                  nome: r.nome.trim(),
                  cnpj: r.cnpj || null,
                  razao_social: r.razao_social || null,
                  vidas: num(r.vidas),
                  grau_risco: num(r.grau_risco),
                  data_entrada: parseDateToISO(r.data_entrada),
                  mes_renovacao: MESES.find((m) => m.toLowerCase() === (r.mes_renovacao ?? "").trim().toLowerCase()) ?? null,
                  tem_contrato: /^(s|sim|true|1)$/i.test((r.tem_contrato ?? "").trim()),
                  dia_faturamento: num(r.dia_faturamento),
                  venc_art: parseDateToISO(r.venc_art),
                  status: /^inativo$/i.test((r.status ?? "").trim()) ? "Inativo" : "Ativo",
                  resp_rh: r.resp_rh || null,
                  rh_telefone: r.rh_telefone || null,
                  rh_email: r.rh_email || null,
                  contabilidade: r.contabilidade || null,
                  resp_contador: r.resp_contador || null,
                  contador_telefone: r.contador_telefone || null,
                  contador_email: r.contador_email || null,
                  endereco: r.endereco || null,
                  cidade: r.cidade || null,
                  estado: r.estado ? r.estado.slice(0, 2).toUpperCase() : null,
                  cep: r.cep || null,
                  telefone: r.telefone || null,
                  observacoes: r.observacoes || null,
                }));
              if (!payload.length) return void toast.error("Nenhum cliente válido no arquivo");
              const { error } = await supabase.from("empresas").insert(payload as never);
              if (error) throw error;
              toast.success(`${payload.length} cliente(s) importado(s)`);
              qc.invalidateQueries({ queryKey: ["empresas"] });
            }}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4 mr-2" /> Novo cliente
              </Button>
            </DialogTrigger>
            <EmpresaForm key={editing?.id ?? "novo"} editing={editing} onSubmit={(d) => saveMut.mutate(d)} busy={saveMut.isPending} />
          </Dialog>
          </div>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Buscar por nome ou CNPJ"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} cliente(s) · {totalVidas} vidas
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Vidas</TableHead>
              <TableHead>Grau risco</TableHead>
              <TableHead>Renovação</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Venc. ART</TableHead>
              <TableHead>Resp. RH</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  <Link to="/empresas/$id" params={{ id: e.id }} className="text-primary hover:underline">
                    {e.nome}
                  </Link>
                </TableCell>
                <TableCell>{e.cnpj || "—"}</TableCell>
                <TableCell>{e.vidas ?? "—"}</TableCell>
                <TableCell>{e.grau_risco ?? "—"}</TableCell>
                <TableCell>{e.mes_renovacao || "—"}</TableCell>
                <TableCell>{e.tem_contrato ? "Sim" : "Não"}</TableCell>
                <TableCell>{fmtDate(e.venc_art)}</TableCell>
                <TableCell>{e.resp_rh || e.contato_responsavel || "—"}</TableCell>
                <TableCell>
                  <Badge variant={(e.status ?? "Ativo") === "Ativo" ? "default" : "secondary"}>
                    {e.status ?? "Ativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(e.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum cliente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EmpresaForm({
  editing,
  onSubmit,
  busy,
}: {
  editing: Empresa | null;
  onSubmit: (d: Partial<Empresa>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<Empresa>>(
    editing ?? { nome: "", status: "Ativo", tem_contrato: false },
  );
  const set = (k: keyof Empresa, v: unknown) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Dados gerais</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Input required value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Razão social</Label>
              <Input value={form.razao_social ?? ""} onChange={(e) => set("razao_social", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vidas</Label>
              <Input type="number" min={0} value={form.vidas ?? ""} onChange={(e) => set("vidas", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Grau de risco</Label>
              <Input type="number" min={1} max={4} value={form.grau_risco ?? ""} onChange={(e) => set("grau_risco", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrada</Label>
              <Input type="date" value={form.data_entrada ?? ""} onChange={(e) => set("data_entrada", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mês de renovação</Label>
              <Select value={form.mes_renovacao ?? "nenhum"} onValueChange={(v) => set("mes_renovacao", v === "nenhum" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">— Nenhum —</SelectItem>
                  {MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tem contrato?</Label>
              <Select value={form.tem_contrato ? "sim" : "nao"} onValueChange={(v) => set("tem_contrato", v === "sim")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia do faturamento</Label>
              <Input type="number" min={1} max={31} value={form.dia_faturamento ?? ""} onChange={(e) => set("dia_faturamento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento da ART</Label>
              <Input type="date" value={form.venc_art ?? ""} onChange={(e) => set("venc_art", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status ?? "Ativo"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Contatos empresariais</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Resp. RH</Label>
              <Input value={form.resp_rh ?? ""} onChange={(e) => set("resp_rh", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.rh_telefone ?? ""} onChange={(e) => set("rh_telefone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.rh_email ?? ""} onChange={(e) => set("rh_email", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Contatos contábeis</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contabilidade</Label>
              <Input value={form.contabilidade ?? ""} onChange={(e) => set("contabilidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Resp. contador</Label>
              <Input value={form.resp_contador ?? ""} onChange={(e) => set("resp_contador", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.contador_telefone ?? ""} onChange={(e) => set("contador_telefone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.contador_email ?? ""} onChange={(e) => set("contador_email", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Endereço e observações</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={form.estado ?? ""} onChange={(e) => set("estado", e.target.value)} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone geral</Label>
              <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </div>
        </section>

        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
