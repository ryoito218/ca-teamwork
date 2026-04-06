import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Camera,
  ImagePlus,
  Download,
  RefreshCw,
  SwitchCamera,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FRAMES } from "@/lib/frames-config";

type Mode = "camera" | "gallery";
type Step = "select-frame" | "capture" | "preview";

export default function Home() {
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("camera");
  const [step, setStep] = useState<Step>("select-frame");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFrame = FRAMES.find((f) => f.id === selectedFrameId);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setCameraError("カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (step === "capture" && mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [step, mode, facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const compositeOnCanvas = useCallback((photoSrc: string, frameUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      const photo = new Image();
      const frame = new Image();
      photo.onload = () => {
        canvas.width = photo.naturalWidth;
        canvas.height = photo.naturalHeight;
        ctx.drawImage(photo, 0, 0);
        frame.onload = () => {
          // object-contain: scale frame to fit within canvas while maintaining aspect ratio
          const scale = Math.min(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
          const fw = frame.naturalWidth * scale;
          const fh = frame.naturalHeight * scale;
          const fx = (canvas.width - fw) / 2;
          const fy = (canvas.height - fh) / 2;
          ctx.drawImage(frame, fx, fy, fw, fh);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        frame.onerror = () => reject(new Error("フレーム画像の読み込みに失敗しました"));
        frame.src = frameUrl;
      };
      photo.onerror = () => reject(new Error("写真の読み込みに失敗しました"));
      photo.src = photoSrc;
    });
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !selectedFrame) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    setCompositing(true);
    try {
      const result = await compositeOnCanvas(photoDataUrl, selectedFrame.imageUrl);
      setCompositeImage(result);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "合成に失敗しました");
    } finally {
      setCompositing(false);
    }
  }, [selectedFrame, compositeOnCanvas, stopCamera]);

  const handleGalleryFile = useCallback(async (file: File) => {
    if (!selectedFrame) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoDataUrl = e.target?.result as string;
      setCompositing(true);
      try {
        const result = await compositeOnCanvas(photoDataUrl, selectedFrame.imageUrl);
        setCompositeImage(result);
        setStep("preview");
      } catch (err: any) {
        toast.error(err.message || "合成に失敗しました");
      } finally {
        setCompositing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [selectedFrame, compositeOnCanvas]);

  const handleDownload = async () => {
    if (!compositeImage) return;
    try {
      const res = await fetch(compositeImage);
      const blob = await res.blob();
      const filename = `frame-photo-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      // Use Web Share API on mobile (iOS/Android) to save to camera roll
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        toast.success("画像を保存しました");
        return;
      }

      // Fallback for desktop
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("画像を保存しました");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("保存に失敗しました");
      }
    }
  };

  const handleReset = () => {
    setCompositeImage(null);
    setStep("select-frame");
    stopCamera();
  };

  return (
    <div className="h-screen bg-gradient-to-b from-purple-950 to-gray-950 text-white flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {/* Header */}
      <header className="flex items-center justify-center px-4 pt-safe-top py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-300" />
          <h1 className="text-base font-bold tracking-wide">Frame Camera</h1>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-3 px-4">
        {(["select-frame", "capture", "preview"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? "bg-purple-500 text-white"
              : i < ["select-frame", "capture", "preview"].indexOf(step) ? "bg-green-500 text-white"
              : "bg-white/10 text-white/40"
            }`}>
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-px bg-white/20" />}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ===== STEP 1: Select Frame ===== */}
        {step === "select-frame" && (
          <div className="flex-1 flex flex-col px-4 pb-6 overflow-y-auto">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              フレームを選択
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => setSelectedFrameId(frame.id)}
                  className={`relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedFrameId === frame.id
                      ? "border-purple-400 scale-95 ring-2 ring-purple-400/50"
                      : "border-white/10 hover:border-white/30"
                  } bg-white/5`}
                >
                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain p-2" />
                  {selectedFrameId === frame.id && (
                    <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-2xl">
                    <p className="text-xs text-white truncate">{frame.name}</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedFrameId && (
              <div className="space-y-3 mt-2">
                <p className="text-center text-sm text-white/60">「{selectedFrame?.name}」を選択中</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => { setMode("camera"); setStep("capture"); }}
                    className="bg-purple-600 hover:bg-purple-700 h-12 rounded-xl"
                  >
                    <Camera className="w-4 h-4 mr-2" /> カメラで撮影
                  </Button>
                  <Button
                    onClick={() => { setMode("gallery"); fileInputRef.current?.click(); }}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-12 rounded-xl"
                  >
                    <ImagePlus className="w-4 h-4 mr-2" /> ギャラリーから
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: Capture ===== */}
        {step === "capture" && mode === "camera" && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ height: "100dvh" }}>
            <div className="relative flex-1 overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              {selectedFrame && (
                <img src={selectedFrame.imageUrl} alt="frame overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center">
                  <div>
                    <p className="text-red-400 text-sm mb-4">{cameraError}</p>
                    <Button onClick={startCamera} variant="outline" className="border-white/30 text-white">再試行</Button>
                  </div>
                </div>
              )}
              {compositing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                </div>
              )}
            </div>
            <div className="bg-black/90 px-6 py-4 flex items-center justify-between pb-safe-bottom shrink-0">
              <Button onClick={handleReset} variant="ghost" className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
              <button
                onClick={handleCapture}
                disabled={compositing}
                className="w-16 h-16 rounded-full bg-white border-4 border-purple-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
              <Button
                onClick={() => setFacingMode((p) => p === "environment" ? "user" : "environment")}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Preview ===== */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col px-4 pb-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">合成プレビュー</h2>
            <div className="flex-1 flex items-center justify-center">
              {compositeImage ? (
                <img src={compositeImage} alt="composite" className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl" />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              )}
            </div>
            <div className="mt-4 space-y-3">
              <Button
                onClick={handleDownload}
                disabled={!compositeImage}
                className="w-full bg-purple-600 hover:bg-purple-700 h-12 rounded-xl text-base font-semibold"
              >
                <Download className="w-5 h-5 mr-2" /> 画像を保存
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 h-12 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> もう一度撮影する
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for gallery */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryFile(f); e.target.value = ""; }} />
    </div>
  );
}
