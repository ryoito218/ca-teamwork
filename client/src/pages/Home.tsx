import { trpc } from "@/lib/trpc";
import { useRef, useState, useEffect, useCallback } from "react";
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
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Mode = "camera" | "gallery";
type Step = "select-frame" | "capture" | "preview";

export default function Home() {
  const utils = trpc.useUtils();
  const { data: frames = [], isLoading: framesLoading, error: framesError, refetch: refetchFrames } = trpc.frames.list.useQuery();

  const uploadMutation = trpc.frames.upload.useMutation({
    onSuccess: () => {
      toast.success("フレームを追加しました");
      utils.frames.list.invalidate();
      setUploadPreview(null);
      setUploadName("");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    },
    onError: (e) => toast.error(`アップロード失敗: ${e.message}`),
  });

  const deleteMutation = trpc.frames.delete.useMutation({
    onSuccess: () => {
      toast.success("フレームを削除しました");
      utils.frames.list.invalidate();
    },
    onError: (e) => toast.error(`削除失敗: ${e.message}`),
  });

  // Camera state
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("camera");
  const [step, setStep] = useState<Step>("select-frame");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Upload state
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadMime, setUploadMime] = useState("image/png");
  const [dragging, setDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const selectedFrame = frames.find((f) => f.id === selectedFrameId);

  // Start camera
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

  // Composite photo + frame
  const compositeOnCanvas = useCallback((photoSrc: string, frameUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      const photo = new Image();
      const frame = new Image();
      frame.crossOrigin = "anonymous";
      photo.crossOrigin = "anonymous";
      photo.onload = () => {
        canvas.width = photo.naturalWidth;
        canvas.height = photo.naturalHeight;
        ctx.drawImage(photo, 0, 0);
        frame.onload = () => {
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        frame.onerror = () => reject(new Error("フレーム画像の読み込みに失敗しました"));
        frame.src = frameUrl;
      };
      photo.onerror = () => reject(new Error("写真の読み込みに失敗しました"));
      photo.src = photoSrc;
    });
  }, []);

  // Capture from camera
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

  // Gallery file selected
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

  // Download
  const handleDownload = () => {
    if (!compositeImage) return;
    const a = document.createElement("a");
    a.href = compositeImage;
    a.download = `frame-photo-${Date.now()}.jpg`;
    a.click();
    toast.success("画像を保存しました");
  };

  const handleReset = () => {
    setCompositeImage(null);
    setStep("select-frame");
    stopCamera();
  };

  // Compress image to fit D1 limits (~700KB base64)
  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.85));
      };
      img.src = dataUrl;
    });
  };

  // Upload frame file handler
  const handleUploadFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("画像ファイルを選択してください"); return; }
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target?.result as string);
      setUploadMime("image/png");
      setUploadPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = () => {
    if (!uploadPreview || !uploadName.trim()) { toast.error("フレーム名と画像を入力してください"); return; }
    uploadMutation.mutate({ name: uploadName.trim(), dataUrl: uploadPreview, mimeType: uploadMime });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-gray-950 text-white flex flex-col">
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

            {framesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : framesError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/60">
                <p className="text-sm text-red-400">フレームの読み込みに失敗しました</p>
                <Button onClick={() => refetchFrames()} variant="outline" size="sm" className="border-white/20 text-white/60">
                  <RefreshCw className="w-3 h-3 mr-1" /> 再試行
                </Button>
              </div>
            ) : frames.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/40">
                <ImagePlus className="w-16 h-16 opacity-30" />
                <p className="text-sm">フレームがまだ登録されていません</p>
                <p className="text-xs">下の「フレームを追加」から登録してください</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {frames.map((frame) => (
                  <div key={frame.id} className="relative group">
                    <button
                      onClick={() => setSelectedFrameId(frame.id)}
                      className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
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
                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="absolute top-2 left-2 bg-red-500/80 text-white rounded-full p-1 shadow">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>フレームを削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>「{frame.name}」を削除します。この操作は取り消せません。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate({ id: frame.id })} className="bg-red-500 hover:bg-red-600">
                            削除する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}

            {/* Upload panel toggle */}
            <button
              onClick={() => setShowUploadPanel((v) => !v)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/20 text-white/50 hover:border-purple-400/60 hover:text-white/80 transition-colors text-sm mb-3"
            >
              <Upload className="w-4 h-4" />
              フレームを追加
              {showUploadPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Upload panel */}
            {showUploadPanel && (
              <div className="bg-white/5 rounded-2xl p-4 space-y-3 mb-4 border border-white/10">
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    dragging ? "border-purple-400 bg-purple-900/30" : "border-white/20 hover:border-purple-400/60"
                  }`}
                  onClick={() => uploadInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUploadFile(f); }}
                >
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="preview" className="max-h-32 mx-auto object-contain rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-white/30">
                      <ImagePlus className="w-8 h-8" />
                      <p className="text-xs">タップまたはドラッグ＆ドロップ</p>
                    </div>
                  )}
                </div>
                <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} />
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="フレーム名を入力"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  onClick={handleUploadSubmit}
                  disabled={!uploadPreview || !uploadName.trim() || uploadMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  {uploadMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 追加中...</> : <><Upload className="w-4 h-4 mr-2" /> 追加する</>}
                </Button>
              </div>
            )}

            {/* Proceed buttons */}
            {selectedFrameId && (
              <div className="space-y-3 mt-2">
                <p className="text-center text-sm text-white/60">「{selectedFrame?.name}」を選択中</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => { setMode("camera"); setStep("capture"); }} className="bg-purple-600 hover:bg-purple-700 h-12 rounded-xl">
                    <Camera className="w-4 h-4 mr-2" /> カメラで撮影
                  </Button>
                  <Button onClick={() => { setMode("gallery"); fileInputRef.current?.click(); }} variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 rounded-xl">
                    <ImagePlus className="w-4 h-4 mr-2" /> ギャラリーから
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: Capture ===== */}
        {step === "capture" && mode === "camera" && (
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1 bg-black overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {selectedFrame && (
                <img src={selectedFrame.imageUrl} alt="frame overlay" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
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
            <div className="bg-black/90 px-6 py-4 flex items-center justify-between pb-safe-bottom">
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
              <Button onClick={() => setFacingMode((p) => p === "environment" ? "user" : "environment")} variant="ghost" className="text-white/60 hover:text-white">
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
              <Button onClick={handleDownload} disabled={!compositeImage} className="w-full bg-purple-600 hover:bg-purple-700 h-12 rounded-xl text-base font-semibold">
                <Download className="w-5 h-5 mr-2" /> 画像を保存
              </Button>
              <Button onClick={handleReset} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-12 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" /> もう一度撮影する
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryFile(f); e.target.value = ""; }} />
    </div>
  );
}
