import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, RefreshCw, X, Check, CameraOff } from "lucide-react";

type CameraCaptureSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called with a JPEG data URL when the user confirms the photo. */
  onConfirm: (dataUrl: string) => void;
  title?: string;
  hint?: string;
};

type CamState = "starting" | "live" | "error";

/**
 * Full-screen selfie capture with a REAL visible preview.
 * Fixes the previous off-DOM/timer capture that produced blank photos (esp. iOS).
 * Uses a visible <video autoPlay muted playsInline>, captures on an explicit tap,
 * and surfaces camera permission / secure-context errors instead of failing silently.
 */
export function CameraCaptureSheet({ open, onClose, onConfirm, title = "Foto do ponto", hint }: CameraCaptureSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("starting");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [captured, setCaptured] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCaptured(null);
    setErrorMsg("");
    setState("starting");
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState("error");
      setErrorMsg("A câmera só funciona em conexão segura (HTTPS). Abra o app pelo endereço oficial.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMsg("Este dispositivo/navegador não permite acessar a câmera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setState("live");
    } catch (err) {
      setState("error");
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorMsg("Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador e tente de novo.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setErrorMsg("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setErrorMsg("Não foi possível abrir a câmera. Tente novamente.");
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      void startCamera();
    } else {
      stopStream();
      setCaptured(null);
      setState("starting");
    }
    return () => stopStream();
  }, [open, startCamera, stopStream]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg", 0.7));
    stopStream();
  };

  const confirm = () => {
    if (captured) onConfirm(captured);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-base font-semibold text-slate-50">{title}</p>
          {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
        <button onClick={onClose} aria-label="Fechar" className="rounded-full bg-slate-800 p-2 text-slate-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-900">
          {/* Live preview */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full scale-x-[-1] object-cover ${captured || state !== "live" ? "hidden" : ""}`}
          />
          {/* Captured still */}
          {captured ? <img src={captured} alt="Foto capturada" className="h-full w-full scale-x-[-1] object-cover" /> : null}

          {state === "starting" && !captured ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Abrindo câmera…</span>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
              <CameraOff className="h-8 w-8 text-amber-300" />
              <p className="text-sm">{errorMsg}</p>
              <Button onClick={() => void startCamera()} variant="outline" className="h-10 rounded-xl border-slate-600 bg-slate-800 text-slate-100">
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar de novo
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {captured ? (
          <div className="flex gap-3">
            <Button onClick={() => void startCamera()} variant="outline" className="h-14 flex-1 rounded-2xl border-slate-600 bg-slate-800 text-slate-100">
              <RefreshCw className="mr-2 h-5 w-5" /> Refazer
            </Button>
            <Button onClick={confirm} className="h-14 flex-[2] rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <Check className="mr-2 h-5 w-5" /> Usar esta foto
            </Button>
          </div>
        ) : (
          <Button
            onClick={takePhoto}
            disabled={state !== "live"}
            className="h-16 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-40"
          >
            <Camera className="mr-2 h-6 w-6" /> Tirar foto
          </Button>
        )}
      </div>
    </div>
  );
}
