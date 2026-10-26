import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBotHealth, restartBot } from "@/services/apiCampanhas";
import { isBotConnected, botStatusLabel } from "@/lib/bot-status";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/conectar-bot")({
  component: ConectarBotPage,
  head: () => ({
    meta: [
      { title: "Conectar Bot WhatsApp | Vitta Engenharia SST" },
      {
        name: "description",
        content:
          "Conecte o WhatsApp da Vitta Engenharia ao robô de campanhas escaneando o QR Code.",
      },
      { property: "og:title", content: "Conectar Bot WhatsApp | Vitta Engenharia SST" },
      {
        property: "og:description",
        content: "Escaneie o QR Code para ativar o envio de campanhas via WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type BotState = {
  status: string;
  qr: string | null;
  whatsapp?: string;
  name?: string;
  queueSize?: number;
};


function ConectarBotPage() {
  const [state, setState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await getBotHealth();
      setState({
        status: String(body?.status ?? "disconnected"),
        qr: (body?.qr as string | null) ?? null,
        whatsapp: body?.whatsapp,
        queueSize: body?.queueSize,
      });
      setOffline(false);
    } catch {
      setOffline(true);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, [load]);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await restartBot();
      toast.success("Sessão reiniciada. Aguarde o novo QR Code.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reiniciar o bot");
    } finally {
      setRestarting(false);
    }
  };

  const connected = isBotConnected(state);
  const hasQr = Boolean(state?.qr) && !connected;
  const isBase64 = state?.qr?.startsWith("data:") ?? false;
  // Alguns backends devolvem o QR embrulhado em link (…/linked_devices#2@…).
  // O WhatsApp espera a string bruta, então normalizamos aqui.
  const rawQr = state?.qr ?? null;
  const qrValue =
    rawQr && !isBase64 && rawQr.includes("#") && /^https?:\/\//i.test(rawQr)
      ? rawQr.slice(rawQr.indexOf("#") + 1)
      : rawQr;


  const statusLabel = botStatusLabel(state, offline);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Conexão do WhatsApp</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Conecte o bot de campanhas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Escaneie o código uma vez para liberar o envio das campanhas pelo número da Vitta.
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
            connected
              ? "border-success/30 bg-success/10 text-foreground"
              : offline
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-warning/40 bg-warning/10 text-foreground"
          }`}
        >
          {connected ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : offline ? (
            <AlertTriangle className="size-4" />
          ) : (
            <CircleDashed className="size-4 text-warning" />
          )}
          {statusLabel}
        </div>
      </header>

      <div className="grid overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-elevated)] lg:grid-cols-[minmax(360px,1fr)_minmax(320px,0.9fr)]">
        <div className="flex flex-col items-center justify-center border-b bg-muted/30 p-6 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center gap-2 self-start text-sm font-semibold">
            <QrCode className="size-5 text-primary" />
            QR Code da conexão
          </div>

          <div className="grid aspect-square w-full max-w-[340px] place-items-center rounded-lg border-2 border-dashed bg-card p-5">
            <div className="grid size-full place-items-center rounded-md border bg-background p-4 shadow-sm">
              {loading ? (
                <div className="space-y-3 text-center">
                  <Loader2 className="mx-auto size-9 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Buscando QR Code...</p>
                </div>
              ) : connected ? (
                <div className="space-y-3 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10">
                    <CheckCircle2 className="size-9 text-success" />
                  </span>
                  <p className="font-display text-lg font-semibold">Conectado com sucesso</p>
                  {state?.whatsapp && (
                    <p className="text-sm text-muted-foreground">{state.whatsapp}</p>
                  )}
                  {typeof state?.queueSize === "number" && (
                    <p className="text-xs text-muted-foreground">
                      Fila: {state.queueSize} mensagem(ns)
                    </p>
                  )}
                </div>
              ) : hasQr && qrValue ? (
                isBase64 ? (
                  <img
                    src={qrValue}
                    alt="QR Code para conectar o WhatsApp do bot"
                    className="h-auto w-full max-w-[276px] rounded-md bg-card p-2"
                  />
                ) : (
                  <div className="w-full max-w-[276px] rounded-md bg-card p-2">
                    <QRCodeSVG value={qrValue} size={276} className="h-auto w-full" />
                  </div>
                )
              ) : (
                <div className="max-w-60 space-y-3 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted">
                    <AlertTriangle className="size-7 text-muted-foreground" />
                  </span>
                  <p className="font-medium">
                    {offline
                      ? "O bot está offline"
                      : "Aguardando geração do QR Code..."}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {offline
                      ? "Verifique o serviço do bot e tente gerar uma nova sessão."
                      : "A tela atualiza automaticamente assim que o código estiver disponível."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex w-full max-w-[340px] flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={handleRestart} disabled={restarting}>
              {restarting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Gerar novo QR Code
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Atualizar status
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Verificação automática a cada 4 segundos
          </p>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8">
            <span className="mb-4 grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Smartphone className="size-5" />
            </span>
            <h2 className="font-display text-xl font-bold">Conecte pelo celular</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use o WhatsApp que enviará as mensagens das campanhas.
            </p>
          </div>

          <ol className="space-y-6">
            {[
              <>Abra o <strong className="text-foreground">WhatsApp</strong> no celular.</>,
              <>
                Acesse <strong className="text-foreground">Configurações</strong> e depois{" "}
                <strong className="text-foreground">Aparelhos conectados</strong>.
              </>,
              <>
                Toque em <strong className="text-foreground">Conectar um aparelho</strong> e
                aponte a câmera para o QR Code.
              </>,
            ].map((step, index) => (
              <li key={index} className="flex gap-4 text-sm leading-relaxed text-muted-foreground">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <p className="pt-1">{step}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex gap-3 rounded-md border bg-accent/50 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              O QR Code expira rapidamente e pode ser renovado. Quando o status mudar para{" "}
              <strong className="text-foreground">WhatsApp conectado</strong>, o envio de
              campanhas estará liberado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
