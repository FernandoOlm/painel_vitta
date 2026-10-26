import React from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, MessageSquare, Activity, QrCode, RefreshCw, Repeat, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getBotHealth, restartBot, dispararCampanha } from '../../services/apiCampanhas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isBotConnected, botStatusLabel, type BotHealth } from '@/lib/bot-status';

type Campanha = {
  id: string;
  titulo: string | null;
  mensagem: string;
  media_url: string | null;
  destinatarios: string[];
  total_destinatarios: number;
  scheduled_at: string | null;
  status: string;
  created_at: string;
  enviados?: number;
  erros?: number;
};

export const Route = createFileRoute('/_app/campanhas/')({
  component: CampanhasList,
});

function CampanhasList() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<BotHealth>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  const loadCampanhas = async () => {
    setLoadingHist(true);
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar histórico de campanhas');
    setCampanhas((data as Campanha[]) ?? []);
    setLoadingHist(false);
  };

  useEffect(() => {
    loadCampanhas();
  }, []);

  const handleReenviar = async (c: Campanha) => {
    if (!window.confirm(`Reenviar esta campanha para ${c.total_destinatarios} destinatário(s)?`)) return;
    setResending(c.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: nova, error: insErr } = await supabase
        .from('campanhas')
        .insert({
          titulo: c.titulo,
          mensagem: c.mensagem,
          media_url: c.media_url,
          destinatarios: c.destinatarios,
          total_destinatarios: c.destinatarios.length,
          status: 'em_andamento',
          criado_por: userData.user?.id ?? null,
        })
        .select('id')
        .single();
      if (insErr || !nova) throw insErr ?? new Error('Erro ao registrar campanha');

      const result = await dispararCampanha({
        message: c.mensagem,
        targets: c.destinatarios,
        mediaUrl: c.media_url || undefined,
        campaignId: nova.id,
      });
      await supabase.from('campanhas').update({ resposta: result?.message ?? null }).eq('id', nova.id);
      toast.success('Campanha reenviada! Acompanhe o progresso.');
      navigate({ to: '/campanhas/$id', params: { id: nova.id } });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao reenviar campanha');
    } finally {
      setResending(null);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Excluir esta campanha do histórico?')) return;
    const { error } = await supabase.from('campanhas').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir campanha');
    toast.success('Campanha excluída');
    loadCampanhas();
  };


  const fetchHealth = async () => {
    try {
      const data = await getBotHealth();
      setHealth(data as BotHealth);
      setOffline(false);
    } catch {
      setHealth(null);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const connected = isBotConnected(health);
  const statusLabel = botStatusLabel(health, offline);

  const handleRestart = async () => {
    if (!window.confirm("Isso irá desconectar o WhatsApp atual e gerar um novo QR Code. Tem certeza?")) return;

    setRestarting(true);
    try {
      await restartBot();
      toast.success('Bot reiniciado! Aguarde o novo QR Code na página de conexão.');
      await fetchHealth();
    } catch {
      toast.error('Erro ao reiniciar o bot.');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campanhas WhatsApp</h1>
          <p className="text-gray-500 mt-1">Gerencie seus disparos em massa para contatos</p>
        </div>
        <Link
          to="/campanhas/nova"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Link>
      </div>

      {/* Conexão: o QR Code vive apenas em /conectar-bot */}
      {!loading && !connected && (
        <div className="mb-8 p-8 border rounded-xl bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">Conectar dispositivo</h2>
            <p className="text-gray-600">
              {offline
                ? 'O bot está offline no momento. Verifique o serviço na VPS e tente novamente.'
                : 'O WhatsApp ainda não está conectado. Escaneie o QR Code na página de conexão para liberar os disparos.'}
            </p>
          </div>
          <Link
            to="/conectar-bot"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Abrir conexão / QR Code
          </Link>
        </div>
      )}

      {/* Health Status Dashboard */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 bg-white flex flex-col">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Status do Bot (VPS)</h3>
            <Activity className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold mb-2">
            {loading ? 'Carregando...' : (
              <span className={connected ? 'text-green-600' : offline ? 'text-red-600' : 'text-amber-600'}>
                {statusLabel}
              </span>
            )}
          </div>
          {connected && (
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="mt-auto text-xs text-red-600 hover:text-red-800 self-start font-medium flex items-center"
            >
              {restarting ? 'Desconectando...' : 'Desconectar / Trocar Número'}
            </button>
          )}
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 bg-white">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Fila de Disparo</h3>
            <MessageSquare className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">
            {health?.queueSize || 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mensagens na memória do Bot aguardando
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Histórico de campanhas</h2>
            <p className="text-sm text-gray-500">Todas as campanhas enviadas ou agendadas.</p>
          </div>
          <button
            onClick={loadCampanhas}
            className="inline-flex items-center rounded-md border px-3 h-9 text-sm hover:bg-gray-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </button>
        </div>

        {loadingHist ? (
          <div className="p-8 text-center text-gray-500">Carregando histórico...</div>
        ) : campanhas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhuma campanha ainda</h3>
            <p className="mt-1">Crie sua primeira campanha para vê-la aqui.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {campanhas.map((c) => (
              <li key={c.id} className="p-6 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{c.titulo || 'Campanha sem título'}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'agendada'
                          ? 'bg-amber-100 text-amber-700'
                          : c.status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-700'
                            : c.status === 'erro'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {c.status === 'agendada'
                        ? 'Agendada'
                        : c.status === 'em_andamento'
                          ? 'Em andamento'
                          : c.status === 'erro'
                            ? 'Erro'
                            : 'Concluída'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(c.scheduled_at || c.created_at).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-gray-500">· {c.total_destinatarios} destinatário(s)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap">{c.mensagem}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 w-40 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${
                            c.total_destinatarios > 0
                              ? Math.min(100, Math.round((((c.enviados ?? 0) + (c.erros ?? 0)) / c.total_destinatarios) * 100))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {(c.enviados ?? 0) + (c.erros ?? 0)}/{c.total_destinatarios} · {c.erros ?? 0} erro(s)
                    </span>
                    <Link
                      to="/campanhas/$id"
                      params={{ id: c.id }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Acompanhar
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReenviar(c)}
                    disabled={resending === c.id}
                    className="inline-flex items-center rounded-md bg-blue-600 text-white px-3 h-9 text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    {resending === c.id ? 'Reenviando...' : 'Repetir'}
                  </button>
                  <Link
                    to="/campanhas/nova"
                    search={{ repetir: c.id }}
                    className="inline-flex items-center rounded-md border px-3 h-9 text-sm hover:bg-gray-100"
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar destinatários
                  </Link>
                  <button
                    onClick={() => handleExcluir(c.id)}
                    className="inline-flex items-center rounded-md border px-3 h-9 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
