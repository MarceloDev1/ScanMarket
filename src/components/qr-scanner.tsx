"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";
import { Camera, CameraOff, CheckCircle2, Image as ImageIcon, Loader2, X } from "lucide-react";
import { formatBRL } from "@/lib/utils";

type ScannerState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "scanning" }
  | { status: "error"; message: string }
  | { status: "saving" }
  | { status: "done"; summary: SavedReceipt };

type SavedReceipt = { id: string; store: string; total: number; itemCount: number };

const READER_ID = "qr-reader";

// NFC-e QR codes are dense and printed small on thermal paper, so the default
// 640x480 stream and a fixed 250px box are too coarse to resolve the modules.
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// Photos from the native camera are ~12MP; decoding that is slow, so shrink first.
const PHOTO_MAX_EDGE = 1600;

async function loadScanner() {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
  return new Html5Qrcode(READER_ID, {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    useBarCodeDetectorIfSupported: true,
  });
}

async function downscalePhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  return blob ? new File([blob], "receipt.jpg", { type: "image/jpeg" }) : file;
}

function describeCameraError(error: unknown) {
  const name = error instanceof Error ? error.name : String(error);
  const text = error instanceof Error ? error.message : String(error);
  if (/NotAllowed|Permission/i.test(name + text)) {
    return "Permissão da câmera negada. Libere o acesso nas configurações do navegador e tente de novo.";
  }
  if (/NotFound|Requested device not found/i.test(name + text)) {
    return "Nenhuma câmera encontrada neste dispositivo.";
  }
  if (/NotReadable|Could not start/i.test(name + text)) {
    return "A câmera está em uso por outro aplicativo.";
  }
  if (!window.isSecureContext) {
    return "A câmera só funciona em conexão segura (HTTPS ou localhost).";
  }
  return "Não foi possível abrir a câmera.";
}

function isSefazUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(\.|^)(sefaz|fazenda)\./i.test(url.hostname);
  } catch {
    return false;
  }
}

export function QrScanner() {
  const [state, setState] = useState<ScannerState>({ status: "idle" });
  const [manualUrl, setManualUrl] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Scanner already stopped; nothing to clean up.
    }
  }, []);

  useEffect(() => () => void stop(), [stop]);

  const saveReceipt = useCallback(async (url: string) => {
    setState({ status: "saving" });
    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setState({ status: "done", summary: data as SavedReceipt });
      } else {
        setState({
          status: "error",
          message: data.error ?? "Não foi possível salvar a nota. Tente novamente.",
        });
      }
    } catch {
      setState({ status: "error", message: "Sem conexão. Verifique a internet e tente de novo." });
    }
  }, []);

  const handleResult = useCallback(
    async (text: string) => {
      await stop();
      if (isSefazUrl(text)) {
        void saveReceipt(text);
      } else {
        setState({
          status: "error",
          message: "Esse QR Code não parece ser de uma nota fiscal (NFC-e). Tente outro.",
        });
      }
    },
    [stop, saveReceipt],
  );

  const start = useCallback(async () => {
    setState({ status: "starting" });
    try {
      const scanner = await loadScanner();
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.8);
            return { width: size, height: size };
          },
          videoConstraints: VIDEO_CONSTRAINTS,
        },
        (text) => void handleResult(text),
        () => {},
      );
      setState({ status: "scanning" });
    } catch (error) {
      await stop();
      setState({ status: "error", message: describeCameraError(error) });
    }
  }, [handleResult, stop]);

  const scanPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await stop();
    setState({ status: "saving" });
    let text: string | null = null;
    try {
      const scanner = await loadScanner();
      try {
        text = await scanner.scanFile(await downscalePhoto(file), false);
      } catch {
        // A small QR in a large photo can vanish when shrunk; retry at full size.
        text = await scanner.scanFile(file, false).catch(() => null);
      }
      scanner.clear();
    } catch {
      text = null;
    }
    if (text) {
      void handleResult(text);
    } else {
      setState({
        status: "error",
        message: "Não encontrei o QR Code na foto. Tire outra bem de perto, com o QR nítido e ocupando boa parte da imagem.",
      });
    }
  };

  const reset = async () => {
    await stop();
    setState({ status: "idle" });
  };

  const submitManual = (event: React.FormEvent) => {
    event.preventDefault();
    const value = manualUrl.trim();
    if (isSefazUrl(value)) {
      void saveReceipt(value);
    } else {
      setState({ status: "error", message: "Cole o link completo da nota (começa com https://)." });
    }
  };

  const cameraOpen = state.status === "starting" || state.status === "scanning";
  const showPlaceholder =
    !cameraOpen && state.status !== "done" && state.status !== "saving";

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          id={READER_ID}
          className={cameraOpen ? "aspect-square w-full bg-black" : "hidden"}
        />
        {showPlaceholder && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
              {state.status === "error" ? (
                <CameraOff className="size-8" />
              ) : (
                <Camera className="size-8" />
              )}
            </div>
            <p className="text-sm text-muted">
              Aponte a câmera para o QR Code no rodapé da nota fiscal do supermercado.
            </p>
          </div>
        )}
        {state.status === "saving" && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm text-muted">Lendo a nota na SEFAZ…</p>
          </div>
        )}
        {state.status === "done" && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <p className="font-semibold">Nota salva!</p>
            <p className="text-sm text-muted">
              {state.summary.store} · {state.summary.itemCount} itens ·{" "}
              {formatBRL(state.summary.total)}
            </p>
            <Link
              href={`/receipts/${state.summary.id}`}
              className="text-sm font-medium text-primary"
            >
              Ver nota
            </Link>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {state.message}
        </p>
      )}

      {state.status === "saving" ? null : cameraOpen ? (
        <button
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-medium"
        >
          {state.status === "starting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Cancelar
        </button>
      ) : (
        <button
          onClick={state.status === "done" ? reset : start}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
        >
          <Camera className="size-5" />
          {state.status === "done" ? "Escanear outra nota" : "Abrir câmera"}
        </button>
      )}

      {state.status !== "saving" && (
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-medium">
          <ImageIcon className="size-5" />
          Tirar foto do QR Code
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={scanPhoto}
            className="sr-only"
          />
        </label>
      )}

      <form onSubmit={submitManual} className="space-y-2">
        <label htmlFor="manual-url" className="text-sm font-medium">
          Ou cole o link da nota
        </label>
        <div className="flex gap-2">
          <input
            id="manual-url"
            type="url"
            inputMode="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://www.sefaz..."
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-4 text-sm font-medium"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
