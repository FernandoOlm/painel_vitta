import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

type Campanha = {
  id: string;
  titulo: string | null;
  mensagem: string;
  media_url: string | null;
  destinatarios: string[];
  total_destinatarios: number;
  status: string;
  created_at: string;
  finalizada_em: string | null;
};

type Log = {
  id: string;
  target: string;
  status: string;
  error_message: string | null;
  sent_at: string;
};

export const Route = createFileRoute('/_app/campanhas/$id')({
  component: AcompanharCampanha,
  head: () => ({
    meta: [
      { title: 'Acompanhar campanha | Vitta Connect' },
      { name: 'description', content: 'Progresso em tempo real do disparo da campanha de WhatsApp.' },
      { property: 'og:title', content: 'Acompanhar campanha | Vitta Connect' },
      { property: 'og:description', content: 'Progresso em tempo real do disparo da campanha de WhatsApp.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

function AcompanharCampanha() {
  const { id } = Route.useParams();
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from('campanhas').select('*').eq('id', id).maybeSingle(),
      supabase.from('campanha_logs').select('*').eq('campanha_id', id).order('sent_at', { ascending: false }),
    ]);
    if (!c) toast.error('Campanha não encontrada');
    setCampanha((c as Campanha) ?? null);
    setLogs((l as Log[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`campanha-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campanha_logs', filter: `campanha_id=eq.${id}` },
        (payload) => {
          const novo = payload.new as Log;
          setLogs((prev) => [novo, ...prev.filter((p) => p.id !== novo.id)]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campanhas', filter: `id=eq.${id}` },
        (payload) => setCampanha(payload.new as Campanha),
      )
      .subscribe();

    // Fallback: se o Realtime cair, refaz o fetch a cada 10s.
    const poll = setInterval(load, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sucessos = useMemo(() => logs.filter((l) => l.status === 'sucesso').length, [logs]);
  const erros = useMemo(() => logs.filter((l) => l.status === 'erro').length, [logs]);
  const total = campanha?.total_destinatarios ?? 0;
  const processados = sucessos + erros;
  const pct = total > 0 ? Math.min(100, Math.round((processados / total) * 100)) : 0;
  const concluida = campanha?.status === 'concluida' || (total > 0 && processados >= total);

  if (loading) return <div className="container mx-auto py-8 text-gray-500">Carregando campanha...</div>;
  if (!campanha) return <div className="container mx-auto py-8 text-gray-500">Campanha não encontrada.</div>;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link to="/campanhas" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para campanhas
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {campanha.titulo || 'Campanha sem título'}
        </h1>
        <p className="text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">{campanha.mensagem}</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {concluida ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Campanha concluída
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Disparo em andamento
              </>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {processados} de {total} ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${concluida ? 'bg-green-600' : 'bg-blue-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{sucessos}</div>
            <p className="text-xs text-gray-500">Enviados</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{erros}</div>
            <p className="text-xs text-gray-500">Erros</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">{Math.max(0, total - processados)}</div>
            <p className="text-xs text-gray-500">Na fila</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Log de envios em tempo real</h2>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            Aguardando o primeiro retorno do bot. Os envios são espaçados propositalmente (anti-ban).
          </div>
        ) : (
          <ul className="divide-y max-h-[480px] overflow-auto">
            {logs.map((l) => (
              <li key={l.id} className="p-4 flex items-center gap-3">
                {l.status === 'sucesso' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span className="font-mono text-sm">{l.target}</span>
                {l.error_message && <span className="text-xs text-red-600 truncate">{l.error_message}</span>}
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(l.sent_at).toLocaleTimeString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
