import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { fmtDate } from "@/lib/format";
import { SituacaoBadge, StatusChip } from "@/components/StatusBadge";
import { moeda, situacao } from "@/lib/status";

export const Route = createFileRoute("/_app/empresas/$id")({
  component: EmpresaDetail,
});

function EmpresaDetail() {
  const { id } = Route.useParams();

  const { data: empresa, isLoading } = useQuery({
    queryKey: ["empresa", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["empresa-pacientes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalhadores")
        .select("id, nome, cpf, funcao, setor, ativo, proximo_exame_data, status_exame")
        .eq("empresa_id", id)
        .order("nome");
      return data ?? [];
    },
  });

  const { data: laudos = [] } = useQuery({
    queryKey: ["empresa-laudos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("laudos")
        .select("id, titulo, tipo, data_emissao, data_vencimento")
        .eq("empresa_id", id)
        .order("data_vencimento", { ascending: true });
      return data ?? [];
    },
  });

  const { data: exames = [] } = useQuery({
    queryKey: ["empresa-exames", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("exames")
        .select("id, status, data, proxima_data, valor, fatura, trabalhador_id, trabalhadores(nome), tipos_exame(nome)")
        .eq("empresa_id", id)
        .order("proxima_data", { ascending: true, nullsFirst: false });
      return (data ?? []) as unknown as {
        id: string;
        status: string;
        data: string | null;
        proxima_data: string | null;
        valor: number | null;
        fatura: number | null;
        trabalhador_id: string | null;
        trabalhadores: { nome: string } | null;
        tipos_exame: { nome: string } | null;
      }[];
    },
  });

  const { data: acoes = [] } = useQuery({
    queryKey: ["empresa-acoes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("planos_acao")
        .select("id, titulo, tipo_acao, status, data_prevista, trabalhador_id, trabalhadores(nome)")
        .eq("empresa_id", id)
        .order("data_prevista", { ascending: true, nullsFirst: false });
      return (data ?? []) as unknown as {
        id: string;
        titulo: string;
        tipo_acao: string;
        status: string;
        data_prevista: string | null;
        trabalhador_id: string | null;
        trabalhadores: { nome: string } | null;
      }[];
    },
  });

  const resumoExames = useMemo(() => {
    let vencidos = 0;
    let aVencer = 0;
    let soma = 0;
    exames.forEach((e) => {
      const s = situacao(e.proxima_data, e.status);
      if (s === "vencido") vencidos++;
      if (s === "a_vencer") aVencer++;
      if (e.status !== "cancelado") soma += Number(e.valor ?? e.fatura ?? 0);
    });
    return { total: exames.length, vencidos, aVencer, soma };
  }, [exames]);

  const resumoAcoes = useMemo(() => {
    let vencidas = 0;
    let aVencer = 0;
    let concluidas = 0;
    acoes.forEach((a) => {
      const s = situacao(a.data_prevista, a.status);
      if (s === "vencido") vencidas++;
      if (s === "a_vencer") aVencer++;
      if (s === "concluido") concluidas++;
    });
    return { total: acoes.length, vencidas, aVencer, concluidas };
  }, [acoes]);

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!empresa) return <div className="text-muted-foreground">Empresa não encontrada.</div>;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/empresas">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>
      <PageHeader title={empresa.nome} description={empresa.razao_social || empresa.cnpj || "Cliente Vitta SST"} />

      <Tabs defaultValue="dados">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="dados">Dados da empresa</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes ({pacientes.length})</TabsTrigger>
          <TabsTrigger value="laudos">Laudos ({laudos.length})</TabsTrigger>
          <TabsTrigger value="exames">Exames ({exames.length})</TabsTrigger>
          <TabsTrigger value="acoes">Ações ({acoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-5 grid sm:grid-cols-3 gap-4 text-sm">
            <Info label="CNPJ" value={empresa.cnpj} />
            <Info label="Razão social" value={empresa.razao_social} />
            <Info label="Status" value={empresa.status} />
            <Info label="Vidas" value={empresa.vidas?.toString()} />
            <Info label="Grau de risco" value={empresa.grau_risco?.toString()} />
            <Info label="Contrato" value={empresa.tem_contrato ? "Sim" : "Não"} />
            <Info label="Entrada" value={fmtDate(empresa.data_entrada)} />
            <Info label="Mês de renovação" value={empresa.mes_renovacao} />
            <Info label="Vencimento ART" value={fmtDate(empresa.venc_art)} />
            <Info label="Telefone" value={empresa.telefone} />
            <Info label="E-mail" value={empresa.email} />
            <Info label="Cidade/UF" value={[empresa.cidade, empresa.estado].filter(Boolean).join("/")} />
            <Info label="RH responsável" value={empresa.resp_rh} />
            <Info label="Telefone RH" value={empresa.rh_telefone} />
            <Info label="E-mail RH" value={empresa.rh_email} />
          </Card>
        </TabsContent>

        <TabsContent value="pacientes">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Próximo exame</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link to="/trabalhadores/$id" params={{ id: p.id }} className="text-primary hover:underline">
                        {p.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{p.cpf || "—"}</TableCell>
                    <TableCell>{p.funcao || "—"}</TableCell>
                    <TableCell>{p.setor || "—"}</TableCell>
                    <TableCell>{fmtDate(p.proximo_exame_data)}</TableCell>
                    <TableCell>
                      <SituacaoBadge date={p.proximo_exame_data} />
                    </TableCell>
                  </TableRow>
                ))}
                {!pacientes.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum paciente vinculado a esta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="laudos">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Laudo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laudos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.titulo}</TableCell>
                    <TableCell>{l.tipo}</TableCell>
                    <TableCell>{fmtDate(l.data_emissao)}</TableCell>
                    <TableCell>{fmtDate(l.data_vencimento)}</TableCell>
                    <TableCell>
                      <SituacaoBadge date={l.data_vencimento} />
                    </TableCell>
                  </TableRow>
                ))}
                {!laudos.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum laudo cadastrado para esta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="exames">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Resumo label="Exames" value={resumoExames.total} />
            <Resumo label="Vencidos" value={resumoExames.vencidos} tone="destructive" />
            <Resumo label="Vencendo em 30 dias" value={resumoExames.aVencer} tone="warning" />
            <Resumo label="Soma dos valores" value={moeda(resumoExames.soma)} />
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Exame</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Realização</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exames.map((e) => (
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
                    <TableCell>{e.tipos_exame?.nome ?? "—"}</TableCell>
                    <TableCell>{moeda(e.valor ?? e.fatura)}</TableCell>
                    <TableCell>{fmtDate(e.data)}</TableCell>
                    <TableCell>{fmtDate(e.proxima_data)}</TableCell>
                    <TableCell>
                      <SituacaoBadge date={e.proxima_data} status={e.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {!exames.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum exame registrado para os pacientes desta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="acoes">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Resumo label="Ações" value={resumoAcoes.total} />
            <Resumo label="Vencidas" value={resumoAcoes.vencidas} tone="destructive" />
            <Resumo label="Vencendo em 30 dias" value={resumoAcoes.aVencer} tone="warning" />
            <Resumo label="Concluídas" value={resumoAcoes.concluidas} tone="success" />
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Prevista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acoes.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.titulo}</TableCell>
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
                    <TableCell>{fmtDate(a.data_prevista)}</TableCell>
                    <TableCell>
                      <StatusChip status={a.status} />
                    </TableCell>
                    <TableCell>
                      <SituacaoBadge date={a.data_prevista} status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {!acoes.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma ação registrada para os pacientes desta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
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

function Resumo({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "destructive" | "warning" | "success";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "text-2xl font-display font-bold " +
          (tone === "destructive"
            ? "text-destructive"
            : tone === "warning"
              ? "text-warning"
              : tone === "success"
                ? "text-success"
                : "")
        }
      >
        {value}
      </div>
    </Card>
  );
}
