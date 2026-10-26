import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addMeses, moeda } from "@/lib/status";

export const TIPOS_ASO = ["Admissional", "Periódico", "Demissional", "Mud. Função", "Ret. Trab."];
export const ESOCIAL = ["Pendente", "Enviado", "Não se aplica"];
export const STATUS_EXAME_OPTS = [
  { v: "agendado", l: "Agendado" },
  { v: "pendente", l: "Pendente" },
  { v: "realizado", l: "Realizado" },
  { v: "vencido", l: "Vencido" },
  { v: "cancelado", l: "Cancelado" },
];

export type TipoExameOpt = {
  id: string;
  nome: string;
  categoria: string | null;
  valor_padrao: number;
  periodicidade_meses: number | null;
  ativo: boolean;
};

export type Exame = {
  id: string;
  trabalhador_id: string | null;
  empresa_id: string | null;
  tipo_exame_id: string | null;
  registro: string | null;
  tipo: string;
  status: string;
  clinica: string | null;
  data: string | null;
  proxima_data: string | null;
  periodicidade_meses: number | null;
  horario: string | null;
  esocial: string | null;
  valor: number | null;
  fatura: number | null;
  lucro: number | null;
  custo: number | null;
  valor_clinica: number | null;
  valor_laboratorio: number | null;
  kit: string | null;
  observacoes: string | null;
  trabalhadores?: { nome: string; cpf?: string | null } | null;
  empresas?: { nome: string } | null;
  tipos_exame?: { nome: string; categoria: string | null } | null;
};

export type ItemExame = { tipo_exame_id: string; valor: number | string | null; periodicidade_meses: number | null };
export type ExameFormData = Partial<Exame> & { itens?: ItemExame[] };

/** Gera uma linha de exame por item selecionado (novo vínculo). */
export function expandItens<T extends Record<string, unknown>>(form: ExameFormData, payload: T): T[] {
  const itens = form.itens ?? [];
  if (!itens.length) return [payload];
  return itens.map((it) => {
    const p = it.periodicidade_meses;
    return {
      ...payload,
      tipo_exame_id: it.tipo_exame_id,
      valor: it.valor === "" || it.valor == null ? null : Number(it.valor),
      periodicidade_meses: p,
      proxima_data: form.data && p ? addMeses(form.data, p) : (payload.proxima_data ?? null),
    };
  });
}

export function ExameForm({
  editing,
  empresas,
  pacientes,
  tipos,
  pacienteFixo,
  onSubmit,
  busy,
}: {
  editing: Exame | null;
  empresas: { id: string; nome: string }[];
  pacientes: { id: string; nome: string; empresa_id: string | null }[];
  tipos: TipoExameOpt[];
  pacienteFixo?: string;
  onSubmit: (d: ExameFormData) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<Exame>>(
    editing ?? {
      tipo: "Periódico",
      status: "pendente",
      esocial: "Pendente",
      trabalhador_id: pacienteFixo ?? null,
      empresa_id: pacientes.find((p) => p.id === pacienteFixo)?.empresa_id ?? null,
    },
  );
  const [itens, setItens] = useState<ItemExame[]>([]);
  const [pick, setPick] = useState("");
  const set = (k: keyof Exame, v: unknown) => setForm({ ...form, [k]: v });
  const multi = !editing;
  const totalItens = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  const tiposDisponiveis = tipos.filter((t) => t.ativo || t.id === form.tipo_exame_id);

  function adicionarItem(id: string) {
    const t = tipos.find((x) => x.id === id);
    if (!t) return;
    setItens([...itens, { tipo_exame_id: id, valor: t.valor_padrao ?? null, periodicidade_meses: t.periodicidade_meses }]);
    setPick("");
  }

  function escolherTipo(id: string) {
    const t = tipos.find((x) => x.id === id);
    const periodicidade = t?.periodicidade_meses ?? form.periodicidade_meses ?? null;
    setForm({
      ...form,
      tipo_exame_id: id,
      // valor padrão apenas como sugestão inicial; fica gravado no vínculo
      valor: form.valor ?? t?.valor_padrao ?? null,
      periodicidade_meses: periodicidade,
      proxima_data:
        form.proxima_data ?? (form.data && periodicidade ? addMeses(form.data, periodicidade) : null),
    });
  }

  function escolherData(data: string) {
    const p = form.periodicidade_meses;
    setForm({
      ...form,
      data,
      proxima_data: data && p ? addMeses(data, Number(p)) : form.proxima_data ?? null,
    });
  }


  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar exame do paciente" : "Vincular exame ao paciente"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (multi) {
            if (!itens.length) return void toast.error("Adicione ao menos um exame do catálogo.");
            onSubmit({ ...form, itens });
          } else onSubmit(form);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
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
                  className="bg-muted"
                  value={empresas.find((e) => e.id === form.empresa_id)?.nome ?? "—"}
                />
              </div>
            </>
          )}

          {multi ? (
            <div className="col-span-2 space-y-2 rounded-md border p-3">
              <Label>Exames do catálogo *</Label>
              <Select value={pick} onValueChange={adicionarItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar exame..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.filter((t) => t.ativo).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} — {moeda(t.valor_padrao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {itens.length > 0 && (
                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{tipos.find((t) => t.id === it.tipo_exame_id)?.nome}</span>
                      <span className="text-xs text-muted-foreground w-20">
                        {it.periodicidade_meses ? `${it.periodicidade_meses} meses` : "—"}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-32"
                        value={it.valor ?? ""}
                        onChange={(e) =>
                          setItens(itens.map((x, i) => (i === idx ? { ...x, valor: e.target.value } : x)))
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remover exame"
                        onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">{itens.length} exame(s)</span>
                <span>
                  Total: <strong>{moeda(totalItens)}</strong>
                </span>
              </div>
            </div>
          ) : (
          <>
          <div className="space-y-1.5">
            <Label>Exame do catálogo *</Label>
            <Select value={form.tipo_exame_id ?? ""} onValueChange={escolherTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {tiposDisponiveis.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                    {t.ativo ? "" : " (inativo)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor aplicado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor ?? ""}
              onChange={(e) => set("valor", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Guardado no vínculo: não muda se o catálogo for editado.</p>
          </div>
          </>
          )}

          <div className="space-y-1.5">
            <Label>Tipo de ASO</Label>
            <Select value={form.tipo ?? "Periódico"} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ASO.map((t) => (
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
                {STATUS_EXAME_OPTS.map((s) => (
                  <SelectItem key={s.v} value={s.v}>
                    {s.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data de realização</Label>
            <Input type="date" value={form.data ?? ""} onChange={(e) => escolherData(e.target.value)} />
          </div>

          {!multi && (
          <>
          <div className="space-y-1.5">
            <Label>Periodicidade (meses)</Label>
            <Input
              type="number"
              min="0"
              value={form.periodicidade_meses ?? ""}
              onChange={(e) => {
                const p = e.target.value;
                setForm({
                  ...form,
                  periodicidade_meses: p === "" ? null : Number(p),
                  proxima_data: form.data && p ? addMeses(form.data, Number(p)) : form.proxima_data ?? null,
                });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Próxima data</Label>
            <Input type="date" value={form.proxima_data ?? ""} onChange={(e) => set("proxima_data", e.target.value)} />
          </div>
          </>
          )}

          <div className="space-y-1.5">
            <Label>Clínica</Label>
            <Input value={form.clinica ?? ""} onChange={(e) => set("clinica", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <Input placeholder="08h45" value={form.horario ?? ""} onChange={(e) => set("horario", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>eSocial</Label>
            <Select value={form.esocial ?? "Pendente"} onValueChange={(v) => set("esocial", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESOCIAL.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>KIT</Label>
            <Input value={form.kit ?? ""} onChange={(e) => set("kit", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fatura (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.fatura ?? ""}
              onChange={(e) => set("fatura", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Custo (R$)</Label>
            <Input type="number" step="0.01" value={form.custo ?? ""} onChange={(e) => set("custo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Lucro (R$)</Label>
            <Input type="number" step="0.01" value={form.lucro ?? ""} onChange={(e) => set("lucro", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Clínicas (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor_clinica ?? ""}
              onChange={(e) => set("valor_clinica", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Laboratório (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor_laboratorio ?? ""}
              onChange={(e) => set("valor_laboratorio", e.target.value)}
            />
          </div>
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
