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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { VencimentoBadge } from "@/components/VencimentoBadge";

export const Route = createFileRoute("/_app/laudos/")({
  component: LaudosPage,
});

type Laudo = {
  id: string;
  tipo: "PCMSO" | "PGR" | "LTCAT" | "PPP" | "AVCB" | "outro";
  titulo: string;
  data_emissao: string | null;
  data_vencimento: string | null;
  arquivo_url: string | null;
  empresa_id: string | null;
  trabalhador_id: string | null;
  observacoes: string | null;
};

function LaudosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Laudo | null>(null);

  const { data: laudos = [] } = useQuery({
    queryKey: ["laudos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laudos")
        .select("*, empresas(nome), trabalhadores(nome)")
        .order("data_vencimento", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as (Laudo & { empresas: { nome: string } | null; trabalhadores: { nome: string } | null })[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => (await supabase.from("empresas").select("id, nome").order("nome")).data ?? [],
  });
  const { data: trabs = [] } = useQuery({
    queryKey: ["trabs-select"],
    queryFn: async () => (await supabase.from("trabalhadores").select("id, nome").order("nome")).data ?? [],
  });

  const filtered = laudos.filter((l) => {
    if (tipoFilter !== "todos" && l.tipo !== tipoFilter) return false;
    if (search && !l.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveMut = useMutation({
    mutationFn: async (form: Partial<Laudo>) => {
      const payload: any = { ...form };
      if (payload.empresa_id === "nenhuma") payload.empresa_id = null;
      if (payload.trabalhador_id === "nenhum") payload.trabalhador_id = null;
      if (editing) {
        const { error } = await supabase.from("laudos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("laudos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Criado");
      qc.invalidateQueries({ queryKey: ["laudos"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("laudos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["laudos"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Laudos"
        description="Gestão e vencimentos de PCMSO, PGR, LTCAT, PPP, AVCB e outros."
        actions={
          <>
            <Button asChild>
              <Link to="/laudos/novo"><Plus className="size-4 mr-2" /> Novo laudo</Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <LaudoForm
                editing={editing}
                empresas={empresas}
                trabs={trabs}
                onSubmit={(d) => saveMut.mutate(d)}
                busy={saveMut.isPending}
              />
            </Dialog>
          </>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input placeholder="Buscar título" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {["PCMSO", "PGR", "LTCAT", "PPP", "AVCB", "outro"].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa / Trabalhador</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.titulo}</TableCell>
                <TableCell>{l.tipo}</TableCell>
                <TableCell className="text-sm">{l.empresas?.nome || l.trabalhadores?.nome || "—"}</TableCell>
                <TableCell>{fmtDate(l.data_emissao)}</TableCell>
                <TableCell>{fmtDate(l.data_vencimento)}</TableCell>
                <TableCell><VencimentoBadge date={l.data_vencimento} /></TableCell>
                <TableCell className="text-right">
                  {l.arquivo_url && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={l.arquivo_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(l.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum laudo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function LaudoForm({
  editing,
  empresas,
  trabs,
  onSubmit,
  busy,
}: {
  editing: Laudo | null;
  empresas: { id: string; nome: string }[];
  trabs: { id: string; nome: string }[];
  onSubmit: (d: Partial<Laudo>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<Laudo>>(editing ?? { tipo: "PCMSO", titulo: "" });
  const set = (k: keyof Laudo, v: any) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{editing ? "Editar laudo" : "Novo laudo"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
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
            <Input required value={form.titulo ?? ""} onChange={(e) => set("titulo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de emissão</Label>
            <Input type="date" value={form.data_emissao ?? ""} onChange={(e) => set("data_emissao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de vencimento</Label>
            <Input type="date" value={form.data_vencimento ?? ""} onChange={(e) => set("data_vencimento", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={form.empresa_id ?? "nenhuma"} onValueChange={(v) => set("empresa_id", v === "nenhuma" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">— Nenhuma —</SelectItem>
                {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Trabalhador</Label>
            <Select value={form.trabalhador_id ?? "nenhum"} onValueChange={(v) => set("trabalhador_id", v === "nenhum" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">— Nenhum —</SelectItem>
                {trabs.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>URL do arquivo (PDF)</Label>
            <Input type="url" placeholder="https://..." value={form.arquivo_url ?? ""} onChange={(e) => set("arquivo_url", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
