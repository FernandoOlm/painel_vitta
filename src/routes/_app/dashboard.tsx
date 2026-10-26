import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { SituacaoBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { LIMITE_DIAS, isPendencia, situacao } from "@/lib/status";
import { Building2, HardHat, FileText, AlertTriangle, Contact2, Stethoscope, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Painel | Vitta SST" },
      {
        name: "description",
        content: "Visão geral da Vitta SST: laudos, exames e ações vencendo, com contagens reais do banco.",
      },
      { property: "og:title", content: "Painel | Vitta SST" },
      { property: "og:description", content: "Visão geral da operação Vitta SST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const limite = new Date(Date.now() + LIMITE_DIAS * 86400000).toISOString().slice(0, 10);

function Dashboard() {
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [empresas, trabalhadores, laudos, contatos, exames, acoes] = await Promise.all([
        supabase.from("empresas").select("*", { count: "exact", head: true }),
        supabase.from("trabalhadores").select("*", { count: "exact", head: true }),
        supabase.from("laudos").select("*", { count: "exact", head: true }),
        supabase.from("contatos").select("*", { count: "exact", head: true }),
        supabase.from("exames").select("*", { count: "exact", head: true }),
        supabase.from("planos_acao").select("*", { count: "exact", head: true }),
      ]);
      return {
        empresas: empresas.count ?? 0,
        trabalhadores: trabalhadores.count ?? 0,
        laudos: laudos.count ?? 0,
        contatos: contatos.count ?? 0,
        exames: exames.count ?? 0,
        acoes: acoes.count ?? 0,
      };
    },
  });

  const { data: laudosVenc = [] } = useQuery({
    queryKey: ["laudos-vencendo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("laudos")
        .select("id, titulo, tipo, data_vencimento, empresas(nome)")
        .not("data_vencimento", "is", null)
        .lte("data_vencimento", limite)
        .order("data_vencimento", { ascending: true })
        .limit(50);
      return (data ?? []) as unknown as {
        id: string;
        titulo: string;
        tipo: string;
        data_vencimento: string | null;
        empresas: { nome: string } | null;
      }[];
    },
  });

  const { data: examesVenc = [] } = useQuery({
    queryKey: ["exames-vencendo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exames")
        .select("id, status, proxima_data, trabalhador_id, trabalhadores(nome), empresas(nome), tipos_exame(nome)")
        .not("proxima_data", "is", null)
        .lte("proxima_data", limite)
        .order("proxima_data", { ascending: true })
        .limit(50);
      return (data ?? []) as unknown as {
        id: string;
        status: string;
        proxima_data: string | null;
        trabalhador_id: string | null;
        trabalhadores: { nome: string } | null;
        empresas: { nome: string } | null;
        tipos_exame: { nome: string } | null;
      }[];
    },
  });

  const { data: acoesVenc = [] } = useQuery({
    queryKey: ["acoes-vencendo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("planos_acao")
        .select("id, titulo, tipo_acao, status, data_prevista, trabalhador_id, trabalhadores(nome), empresas(nome)")
        .not("data_prevista", "is", null)
        .lte("data_prevista", limite)
        .order("data_prevista", { ascending: true })
        .limit(50);
      return (data ?? []) as unknown as {
        id: string;
        titulo: string;
        tipo_acao: string;
        status: string;
        data_prevista: string | null;
        trabalhador_id: string | null;
        trabalhadores: { nome: string } | null;
        empresas: { nome: string } | null;
      }[];
    },
  });

  const laudosPend = laudosVenc.filter((l) => isPendencia(situacao(l.data_vencimento)));
  const examesPend = examesVenc.filter((e) => isPendencia(situacao(e.proxima_data, e.status)));
  const acoesPend = acoesVenc.filter((a) => isPendencia(situacao(a.data_prevista, a.status)));

  const stats = [
    { label: "Empresas", value: counts?.empresas ?? 0, icon: Building2, to: "/empresas" as const },
    { label: "Pacientes", value: counts?.trabalhadores ?? 0, icon: HardHat, to: "/trabalhadores" as const },
    { label: "Laudos", value: counts?.laudos ?? 0, icon: FileText, to: "/laudos" as const },
    { label: "Exames", value: counts?.exames ?? 0, icon: Stethoscope, to: "/exames" as const },
    { label: "Ações", value: counts?.acoes ?? 0, icon: ClipboardList, to: "/plano-acoes" as const },
    { label: "Contatos", value: counts?.contatos ?? 0, icon: Contact2, to: "/contatos" as const },
  ];

  return (
    <div>
      <PageHeader title="Painel" description="Visão geral da operação Vitta SST." />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to={s.to}>
              <Card className="p-5 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">{s.label}</div>
                    <div className="text-3xl font-display font-bold text-foreground mt-1">{s.value}</div>
                  </div>
                  <div className="size-10 shrink-0 rounded-md bg-accent grid place-items-center">
                    <Icon className="size-5 text-primary" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Bloco
          titulo="Laudos vencendo"
          total={laudosPend.length}
          link="/laudos"
          linkLabel="Ver laudos"
          vazio="Nenhum laudo vencido ou vencendo em 30 dias."
        >
          {laudosPend.map((l) => (
            <li key={l.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{l.titulo}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.tipo} · {l.empresas?.nome ?? "—"} · {fmtDate(l.data_vencimento)}
                </div>
              </div>
              <SituacaoBadge date={l.data_vencimento} />
            </li>
          ))}
        </Bloco>

        <Bloco
          titulo="Exames vencendo"
          total={examesPend.length}
          link="/exames"
          linkLabel="Ver exames"
          vazio="Nenhum exame vencido ou vencendo em 30 dias."
        >
          {examesPend.map((e) => (
            <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {e.trabalhador_id ? (
                    <Link to="/trabalhadores/$id" params={{ id: e.trabalhador_id }} className="hover:underline">
                      {e.trabalhadores?.nome ?? "Paciente"}
                    </Link>
                  ) : (
                    (e.trabalhadores?.nome ?? "Paciente")
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {e.tipos_exame?.nome ?? "Exame"} · {e.empresas?.nome ?? "—"} · {fmtDate(e.proxima_data)}
                </div>
              </div>
              <SituacaoBadge date={e.proxima_data} status={e.status} />
            </li>
          ))}
        </Bloco>

        <Bloco
          titulo="Ações vencendo"
          total={acoesPend.length}
          link="/plano-acoes"
          linkLabel="Ver plano de ações"
          vazio="Nenhuma ação vencida ou vencendo em 30 dias."
        >
          {acoesPend.map((a) => (
            <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {a.trabalhador_id ? (
                    <Link to="/trabalhadores/$id" params={{ id: a.trabalhador_id }} className="hover:underline">
                      {a.titulo}
                    </Link>
                  ) : (
                    a.titulo
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {a.tipo_acao} · {a.trabalhadores?.nome ?? a.empresas?.nome ?? "—"} · {fmtDate(a.data_prevista)}
                </div>
              </div>
              <SituacaoBadge date={a.data_prevista} status={a.status} />
            </li>
          ))}
        </Bloco>
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  total,
  link,
  linkLabel,
  vazio,
  children,
}: {
  titulo: string;
  total: number;
  link: "/laudos" | "/exames" | "/plano-acoes";
  linkLabel: string;
  vazio: string;
  children: ReactNode;
}) {
  const vazioLista = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" />
          {titulo}
        </h2>
        <Link to={link} className="text-xs text-primary hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        <strong className="text-foreground">{total}</strong> item(ns) vencido(s) ou vencendo em até {LIMITE_DIAS} dias
      </div>
      {vazioLista ? <p className="text-sm text-muted-foreground">{vazio}</p> : <ul className="divide-y">{children}</ul>}
    </Card>
  );
}
