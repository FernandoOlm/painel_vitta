import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, Pencil, CheckCircle2, Ban } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { SituacaoBadge, StatusChip } from "@/components/StatusBadge";
import { moeda, situacao } from "@/lib/status";
import { ExameForm, expandItens, type Exame, type TipoExameOpt } from "@/components/ExameForm";
import { AcaoForm, type PlanoAcao } from "./plano-acoes";

export const Route = createFileRoute("/_app/trabalhadores/$id")({
  component: TrabalhadorDetail,
});

function TrabalhadorDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [openExame, setOpenExame] = useState(false);
  const [editExame, setEditExame] = useState<Exame | null>(null);
  const [delExame, setDelExame] = useState<Exame | null>(null);
  const [openAcao, setOpenAcao] = useState(false);
  const [editAcao, setEditAcao] = useState<PlanoAcao | null>(null);
  const [delAcao, setDelAcao] = useState<PlanoAcao | null>(null);

  const { data: trab, isLoading } = useQuery({
    queryKey: ["trabalhador", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhadores")
        .select("*, empresas(id, nome, cnpj, telefone, email)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const empresa = trab?.empresas as
    | { id: string; nome: string; cnpj: string | null; telefone: string | null; email: string | null }
    | null;

  const { data: exames = [] } = useQuery({
    queryKey: ["exames-paciente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exames")
        .select("*, tipos_exame(nome, categoria)")
        .eq("trabalhador_id", id)
        .order("proxima_data", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as Exame[];
    },
  });

  const { data: acoes = [] } = useQuery({
    queryKey: ["acoes-paciente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_acao")
        .select("*")
        .eq("trabalhador_id", id)
        .order("data_prevista", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as PlanoAcao[];
    },
  });

  const { data: laudos = [] } = useQuery({
    queryKey: ["laudos-paciente", id, empresa?.id],
    enabled: !!trab,
    queryFn: async () => {
      const filtro = empresa?.id
        ? `trabalhador_id.eq.${id},empresa_id.eq.${empresa.id}`
        : `trabalhador_id.eq.${id}`;
      const { data } = await supabase
        .from("laudos")
        .select("id, titulo, tipo, data_vencimento, empresa_id, trabalhador_id")
        .or(filtro)
        .order("data_vencimento", { ascending: true });
      return data ?? [];
    },
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-exame-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("tipos_exame").select("*").order("nome");
      return (data ?? []) as TipoExameOpt[];
    },
  });

  const { data: empresasOpt = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const totalExames = useMemo(
    () =>
      exames
        .filter((e) => e.status !== "cancelado")
        .reduce((a, e) => a + Number(e.valor ?? e.fatura ?? 0), 0),
    [exames],
  );

  const num = (v: unknown) => (v === "" || v == null ? null : Number(v));

  const saveExame = useMutation({
    mutationFn: async (form: Partial<Exame>) => {
      const payload = {
        trabalhador_id: id,
        empresa_id: empresa?.id ?? null,
        tipo_exame_id: form.tipo_exame_id || null,
        tipo: form.tipo ?? "Periódico",
        status: form.status ?? "pendente",
        clinica: form.clinica || null,
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
      if (editExame) {
        const { error } = await supabase.from("exames").update(payload).eq("id", editExame.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exames").insert(expandItens(form, payload));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editExame ? "Exame atualizado" : "Exame vinculado");
      qc.invalidateQueries({ queryKey: ["exames-paciente", id] });
      qc.invalidateQueries({ queryKey: ["exames"] });
      setOpenExame(false);
      setEditExame(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeExame = useMutation({
    mutationFn: async (exameId: string) => {
      const { error } = await supabase.from("exames").delete().eq("id", exameId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exame desvinculado");
      qc.invalidateQueries({ queryKey: ["exames-paciente", id] });
      setDelExame(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAcao = useMutation({
    mutationFn: async (form: Partial<PlanoAcao>) => {
      if (!form.titulo?.trim()) throw new Error("Informe o título da ação.");
      const payload = {
        titulo: form.titulo.trim(),
        tipo_acao: form.tipo_acao ?? "Treinamento",
        descricao: form.descricao || null,
        trabalhador_id: id,
        empresa_id: empresa?.id ?? null,
        data_abertura: form.data_abertura || new Date().toISOString().slice(0, 10),
        data_prevista: form.data_prevista || null,
        data_conclusao: form.data_conclusao || null,
        status: form.status ?? "pendente",
        observacoes: form.observacoes || null,
      };
      if (editAcao) {
        const { error } = await supabase.from("planos_acao").update(payload).eq("id", editAcao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planos_acao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editAcao ? "Ação atualizada" : "Ação vinculada");
      qc.invalidateQueries({ queryKey: ["acoes-paciente", id] });
      qc.invalidateQueries({ queryKey: ["planos-acao"] });
      setOpenAcao(false);
      setEditAcao(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusAcao = useMutation({
    mutationFn: async ({ acaoId, status }: { acaoId: string; status: string }) => {
      const patch = {
        status,
        ...(status === "concluida" ? { data_conclusao: new Date().toISOString().slice(0, 10) } : {}),
      };
      const { error } = await supabase.from("planos_acao").update(patch).eq("id", acaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação atualizada");
      qc.invalidateQueries({ queryKey: ["acoes-paciente", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAcao = useMutation({
    mutationFn: async (acaoId: string) => {
      const { error } = await supabase.from("planos_acao").delete().eq("id", acaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação removida");
      qc.invalidateQueries({ queryKey: ["acoes-paciente", id] });
      setDelAcao(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!trab) return <div className="text-muted-foreground">Paciente não encontrado.</div>;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/trabalhadores">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>
      <PageHeader
        title={trab.nome}
        description={`${trab.funcao || "Sem função"} · ${empresa?.nome ?? "Sem empresa"}`}
      />

      <Tabs defaultValue="dados">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="laudos">Laudos ({laudos.length})</TabsTrigger>
          <TabsTrigger value="exames">Exames ({exames.length})</TabsTrigger>
          <TabsTrigger value="acoes">Ações ({acoes.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-5 grid sm:grid-cols-3 gap-4 text-sm">
            <Info label="CPF" value={trab.cpf} />
            <Info label="RG" value={trab.rg} />
            <Info label="Nascimento" value={fmtDate(trab.data_nascimento)} />
            <Info label="Função" value={trab.funcao} />
            <Info label="CBO" value={trab.cbo} />
            <Info label="Setor" value={trab.setor} />
            <Info label="Admissão" value={fmtDate(trab.data_admissao)} />
            <Info label="Demissão" value={fmtDate(trab.data_demissao)} />
            <Info label="Registro" value={trab.registro} />
            <Info label="Telefone" value={trab.telefone} />
            <Info label="E-mail" value={trab.email} />
            <Info label="Situação" value={trab.ativo ? "Ativo" : "Inativo"} />
          </Card>
        </TabsContent>

        <TabsContent value="empresa">
          <Card className="p-5 text-sm">
            {empresa ? (
              <div className="grid sm:grid-cols-3 gap-4">
                <Info label="Empresa" value={empresa.nome} />
                <Info label="CNPJ" value={empresa.cnpj} />
                <Info label="Telefone" value={empresa.telefone} />
                <Info label="E-mail" value={empresa.email} />
                <div className="sm:col-span-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/empresas/$id" params={{ id: empresa.id }}>
                      Abrir ficha da empresa
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Este paciente não está vinculado a nenhuma empresa.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="laudos">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Laudo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laudos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.titulo}</TableCell>
                    <TableCell>{l.tipo}</TableCell>
                    <TableCell>{fmtDate(l.data_vencimento)}</TableCell>
                    <TableCell>
                      <SituacaoBadge date={l.data_vencimento} />
                    </TableCell>
                  </TableRow>
                ))}
                {!laudos.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum laudo relacionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="exames">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              Total dos exames (todos os vínculos, exceto cancelados):{" "}
              <strong className="text-foreground">{moeda(totalExames)}</strong>
            </div>
            <Dialog open={openExame} onOpenChange={setOpenExame}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditExame(null)}>
                  <Plus className="size-4 mr-2" /> Vincular exame
                </Button>
              </DialogTrigger>
              <ExameForm
                key={editExame?.id ?? "novo"}
                editing={editExame}
                empresas={empresasOpt}
                pacientes={[{ id, nome: trab.nome, empresa_id: empresa?.id ?? null }]}
                tipos={tipos}
                pacienteFixo={id}
                onSubmit={(d) => saveExame.mutate(d)}
                busy={saveExame.isPending}
              />
            </Dialog>
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                {exames.map((e) => (
                  <TableRow key={e.id} className={situacao(e.proxima_data, e.status) === "vencido" ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
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
                          setEditExame(e);
                          setOpenExame(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Desvincular" onClick={() => setDelExame(e)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!exames.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum exame vinculado a este paciente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="acoes">
          <div className="flex items-center justify-end mb-3">
            <Dialog open={openAcao} onOpenChange={setOpenAcao}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditAcao(null)}>
                  <Plus className="size-4 mr-2" /> Nova ação
                </Button>
              </DialogTrigger>
              <AcaoForm
                key={editAcao?.id ?? "nova"}
                editing={editAcao}
                empresas={empresasOpt}
                pacientes={[{ id, nome: trab.nome, empresa_id: empresa?.id ?? null }]}
                pacienteFixo={id}
                onSubmit={(d) => saveAcao.mutate(d)}
                busy={saveAcao.isPending}
              />
            </Dialog>
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prevista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acoes.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.titulo}</TableCell>
                    <TableCell>{a.tipo_acao}</TableCell>
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
                        onClick={() => statusAcao.mutate({ acaoId: a.id, status: "concluida" })}
                      >
                        <CheckCircle2 className="size-4 text-success" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Cancelar"
                        disabled={a.status === "cancelada"}
                        onClick={() => statusAcao.mutate({ acaoId: a.id, status: "cancelada" })}
                      >
                        <Ban className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => {
                          setEditAcao(a);
                          setOpenAcao(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDelAcao(a)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!acoes.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma ação vinculada a este paciente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="p-5 text-sm space-y-4">
            <div>
              <div className="text-muted-foreground text-xs mb-1">Exames realizados</div>
              {exames.filter((e) => e.status === "realizado").length ? (
                <ul className="space-y-1">
                  {exames
                    .filter((e) => e.status === "realizado")
                    .map((e) => (
                      <li key={e.id}>
                        {fmtDate(e.data)} · {e.tipos_exame?.nome ?? e.tipo} · {moeda(e.valor ?? e.fatura)}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum exame realizado registrado.</p>
              )}
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Ações concluídas</div>
              {acoes.filter((a) => a.status === "concluida").length ? (
                <ul className="space-y-1">
                  {acoes
                    .filter((a) => a.status === "concluida")
                    .map((a) => (
                      <li key={a.id}>
                        {fmtDate(a.data_conclusao)} · {a.tipo_acao} · {a.titulo}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhuma ação concluída registrada.</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!delExame} onOpenChange={(o) => !o && setDelExame(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular este exame?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro será removido do histórico do paciente. Exames já realizados devem preferencialmente ser
              mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => delExame && removeExame.mutate(delExame.id)}>
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!delAcao} onOpenChange={(o) => !o && setDelAcao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{delAcao?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => delAcao && removeAcao.mutate(delAcao.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}
