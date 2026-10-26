import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { dispararCampanha } from '../../services/apiCampanhas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Image as ImageIcon, Users, Clock, Calendar, MessageSquare, Upload, Tag } from 'lucide-react';

type Search = { repetir?: string; nums?: string };

export const Route = createFileRoute('/_app/campanhas/nova')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    repetir: typeof search.repetir === 'string' ? search.repetir : undefined,
    nums: typeof search.nums === 'string' ? search.nums : undefined,
  }),
  component: NovaCampanha,
});

function NovaCampanha() {
  const navigate = useNavigate();
  const { repetir, nums } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    message: '',
    targets: nums ? nums.split(',').filter(Boolean).join('\n') : '',
    mediaUrl: '',
    scheduledAt: '',
  });


  useEffect(() => {
    if (!repetir) return;
    (async () => {
      const { data, error } = await supabase
        .from('campanhas')
        .select('*')
        .eq('id', repetir)
        .maybeSingle();
      if (error || !data) {
        toast.error('Não foi possível carregar a campanha para repetir.');
        return;
      }
      setFormData({
        titulo: data.titulo ?? '',
        message: data.mensagem ?? '',
        targets: (data.destinatarios ?? []).join('\n'),
        mediaUrl: data.media_url ?? '',
        scheduledAt: '',
      });
      toast.success('Campanha carregada. Edite os destinatários e reenvie.');
    })();
  }, [repetir]);

  const handleUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Arquivo maior que 25 MB.');
      return;
    }
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('campanhas-midia').upload(path, file);
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from('campanhas-midia')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data) throw signErr ?? new Error('Falha ao gerar link');
      setFormData((f) => ({ ...f, mediaUrl: data.signedUrl }));
      toast.success('Arquivo enviado!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message) {
      toast.error('A mensagem é obrigatória');
      return;
    }

    if (!formData.targets) {
      toast.error('Você deve informar ao menos um destinatário');
      return;
    }

    const targetList = formData.targets
      .split(/[\n,]+/)
      .map((t) => t.trim().replace(/\D/g, ''))
      .filter((t) => t.length > 8);

    if (targetList.length === 0) {
      toast.error('Nenhum número de telefone válido encontrado');
      return;
    }

    setLoading(true);
    try {
      const scheduledIso = formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined;
      const { data: userData } = await supabase.auth.getUser();

      // 1) Cria a campanha antes do disparo para gerar o campaign_id do acompanhamento
      const { data: campanha, error: insertErr } = await supabase
        .from('campanhas')
        .insert({
          titulo: formData.titulo || null,
          mensagem: formData.message,
          media_url: formData.mediaUrl || null,
          destinatarios: targetList,
          total_destinatarios: targetList.length,
          scheduled_at: scheduledIso ?? null,
          status: scheduledIso ? 'agendada' : 'em_andamento',
          criado_por: userData.user?.id ?? null,
        })
        .select('id')
        .single();
      if (insertErr || !campanha) throw insertErr ?? new Error('Erro ao registrar campanha');

      // 2) Envia ao bot com o campaign_id (a Edge Function injeta a webhook_url)
      try {
        const result = await dispararCampanha({
          message: formData.message,
          targets: targetList,
          mediaUrl: formData.mediaUrl || undefined,
          scheduledAt: scheduledIso,
          campaignId: campanha.id,
        });
        await supabase.from('campanhas').update({ resposta: result?.message ?? null }).eq('id', campanha.id);
      } catch (err: any) {
        await supabase.from('campanhas').update({ status: 'erro', resposta: err?.message ?? 'Falha no disparo' }).eq('id', campanha.id);
        throw err;
      }

      toast.success('Campanha iniciada! Acompanhe o progresso em tempo real.');
      navigate({ to: '/campanhas/$id', params: { id: campanha.id } });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {repetir ? 'Repetir Campanha' : 'Nova Campanha'}
        </h1>
        <p className="text-gray-500 mt-1">Configure o disparo em massa para seus contatos.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none flex items-center">
              <Tag className="w-4 h-4 mr-2" />
              Título (Opcional)
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
              placeholder="Ex: Campanha PCMSO Agosto"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Destinatários (Números de WhatsApp)
            </label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
              placeholder="Exemplo:&#10;5511999999999&#10;5511888888888&#10;(Um número por linha ou separados por vírgula)"
              value={formData.targets}
              onChange={(e) => setFormData({ ...formData, targets: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Digite apenas números com o código do país (ex: 55 para Brasil).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                URL da Mídia (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center whitespace-nowrap rounded-md border px-3 h-10 text-sm hover:bg-gray-100 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Buscar da máquina'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Agendar Envio (Opcional)
              </label>
              <input
                type="datetime-local"
                min={getMinDateTime()}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
              <p className="text-xs text-gray-500">Deixe em branco para disparar imediatamente.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagem
            </label>
            <textarea
              className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
              placeholder="Digite o texto da sua campanha aqui..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate({ to: '/campanhas' })}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-gray-100 h-10 px-4 py-2 border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (
                <>
                  {formData.scheduledAt ? <Calendar className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {formData.scheduledAt ? 'Agendar Campanha' : 'Disparar Campanha'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
