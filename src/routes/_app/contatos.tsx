import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, MessageCircle, Mail, Trash2, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { waLink, mailtoLink } from "@/lib/format";

export const Route = createFileRoute("/_app/contatos")({
  component: ContatosPage,
});

type Contato = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: "cliente" | "nao_cliente";
  observacoes: string | null;
};

function ContatosPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"todos" | "cliente" | "nao_cliente">("todos");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Contato | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);


  const { data: contatos = [] } = useQuery({
    queryKey: ["contatos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contato[];
    },
  });

  const filtered = contatos.filter((c) => {
    if (filter !== "todos" && c.tipo !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.nome.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefone?.includes(q)
      );
    }
    return true;
  });

  const saveMut = useMutation({
    mutationFn: async (form: Partial<Contato>) => {
      if (editing?.id) {
        const { error } = await supabase.from("contatos").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contatos").insert(form as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Contato atualizado" : "Contato criado");
      qc.invalidateQueries({ queryKey: ["contatos"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato removido");
      qc.invalidateQueries({ queryKey: ["contatos"] });
    },
  });

  function handleImport(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data
          .map((r) => ({
            nome: r.nome || r.Nome || r.name || "",
            telefone: r.telefone || r.Telefone || r.phone || null,
            email: r.email || r.Email || r["e-mail"] || null,
            tipo: ((r.tipo || r.Tipo || "nao_cliente").toLowerCase().includes("cliente") &&
            !(r.tipo || r.Tipo || "").toLowerCase().includes("não")
              ? "cliente"
              : "nao_cliente") as "cliente" | "nao_cliente",
          }))
          .filter((r) => r.nome);
        if (!rows.length) {
          toast.error("Nenhum contato válido no arquivo");
          return;
        }
        const { error } = await supabase.from("contatos").insert(rows as any);
        if (error) toast.error(error.message);
        else {
          toast.success(`${rows.length} contatos importados`);
          qc.invalidateQueries({ queryKey: ["contatos"] });
        }
      },
    });
  }

  function downloadModeloCSV() {
    const headers = ["nome", "telefone", "email", "tipo"];
    const sample = [
      ["João da Silva", "5511999990001", "joao@empresa.com", "cliente"],
      ["Maria Souza", "5511999990002", "maria@empresa.com", "nao_cliente"],
      ["Empresa ABC", "5511999990003", "contato@abc.com", "cliente"],
    ];
    const csv = [headers.join(";"), ...sample.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-contatos-vitta.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const selectable = filtered.filter((c) => c.telefone);
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.includes(c.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function criarCampanha() {
    const nums = contatos
      .filter((c) => selected.includes(c.id) && c.telefone)
      .map((c) => c.telefone!.replace(/\D/g, ""))
      .filter(Boolean);
    if (!nums.length) {
      toast.error("Selecione ao menos um contato com telefone");
      return;
    }
    navigate({ to: "/campanhas/nova", search: { nums: nums.join(",") } });
  }

  return (

    <div>
      <PageHeader
        title="Contatos"
        description="Base comercial. Importe listas, segmente e dispare campanhas."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4 mr-2" /> Importar CSV
            </Button>
            <Button variant="outline" onClick={downloadModeloCSV}>
              <Download className="size-4 mr-2" /> Modelo CSV
            </Button>
            <Button variant="outline" onClick={criarCampanha}>
              <MessageCircle className="size-4 mr-2" /> Criar Campanha
              {selected.length > 0 && ` (${selected.length})`}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="size-4 mr-2" /> Novo
                </Button>
              </DialogTrigger>
              <ContatoForm editing={editing} onSubmit={(d) => saveMut.mutate(d)} busy={saveMut.isPending} />
            </Dialog>
          </>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="cliente">Clientes</SelectItem>
            <SelectItem value="nao_cliente">Não clientes</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center ml-auto">
          {filtered.length} de {contatos.length}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) =>
                    setSelected(v ? filtered.filter((c) => c.telefone).map((c) => c.id) : [])
                  }
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} data-state={selected.includes(c.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(c.id)}
                    disabled={!c.telefone}
                    onCheckedChange={() => toggle(c.id)}
                    aria-label={`Selecionar ${c.nome}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.telefone || "—"}</TableCell>
                <TableCell>{c.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.tipo === "cliente" ? "default" : "secondary"}>
                    {c.tipo === "cliente" ? "Cliente" : "Não cliente"}
                  </Badge>

                </TableCell>
                <TableCell className="text-right space-x-1">
                  {c.telefone && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={waLink(c.telefone)} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                        <MessageCircle className="size-4" />
                      </a>
                    </Button>
                  )}
                  {c.email && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={mailtoLink(c.email)} title="E-mail">
                        <Mail className="size-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remover contato?")) delMut.mutate(c.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum contato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ContatoForm({
  editing,
  onSubmit,
  busy,
}: {
  editing: Contato | null;
  onSubmit: (d: Partial<Contato>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<Contato>>(
    editing ?? { nome: "", telefone: "", email: "", tipo: "nao_cliente", observacoes: "" },
  );
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input required value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Contato["tipo"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="nao_cliente">Não cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
