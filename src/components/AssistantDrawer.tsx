import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileAudio,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatCOP } from '../data/budgetData';
import { BudgetMovement } from '../types/budget';

export interface RegisterExpensePayload {
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface AssistantAttachmentPreview {
  kind: 'image' | 'audio';
  previewUrl: string;
  fileName: string;
}

interface PendingAttachment extends AssistantAttachmentPreview {
  mimeType: string;
  data: string; // base64 without prefix
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachment?: AssistantAttachmentPreview;
  registeredExpense?: RegisterExpensePayload;
  isError?: boolean;
}

interface AssistantBudgetContext {
  userName: string;
  monthName: string;
  currentDateISO: string;
  monthlyBudget: number;
  totalIncome: number;
  totalSpent: number;
  availableBalance: number;
  spentPercentage: number;
  recentMovements: BudgetMovement[];
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AssistantMessage[];
  onAddMessage: (message: AssistantMessage) => void;
  onRegisterExpense: (payload: RegisterExpensePayload) => void;
  onUpdateUserName: (name: string) => void;
  budgetContext: AssistantBudgetContext;
}

const QUICK_PROMPTS = [
  'Gasté 25.000 en almuerzo hoy',
  '¿Me alcanza para comprar unos tenis de 180.000?',
  '¿Cuánto saldo disponible tengo?',
];

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

function formatRecordingTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo seleccionado.'));
      }
    };
    reader.onerror = () =>
      reject(new Error('Error al leer el archivo adjunto.'));
    reader.readAsDataURL(blob);
  });
}

async function prepareImageAttachment(
  file: File,
): Promise<PendingAttachment> {
  const dataUrl = await readBlobAsDataUrl(file);
  const rawMime = (file.type || 'image/jpeg').split(';')[0].trim();

  // Keep small images untouched; resize/compress large photos for fast receipt OCR
  if (file.size <= 900 * 1024 && rawMime.startsWith('image/')) {
    const base64 = dataUrl.split(',')[1] ?? '';
    return {
      kind: 'image',
      mimeType: rawMime,
      data: base64,
      previewUrl: dataUrl,
      fileName: file.name || 'recibo.jpg',
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({
          kind: 'image',
          mimeType: rawMime || 'image/jpeg',
          data: base64,
          previewUrl: dataUrl,
          fileName: file.name || 'recibo.jpg',
        });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressedUrl = canvas.toDataURL('image/jpeg', 0.86);
      const base64 = compressedUrl.split(',')[1] ?? '';
      resolve({
        kind: 'image',
        mimeType: 'image/jpeg',
        data: base64,
        previewUrl: compressedUrl,
        fileName: file.name || 'recibo.jpg',
      });
    };
    img.onerror = () =>
      reject(new Error('No se pudo procesar la imagen seleccionada.'));
    img.src = dataUrl;
  });
}

function getFriendlyMediaError(
  error: unknown,
  mediaKind: 'microphone' | 'camera',
): string {
  const targetLabel =
    mediaKind === 'microphone' ? 'micrófono' : 'cámara';
  const fallbackHint =
    mediaKind === 'microphone'
      ? 'También puedes subir un archivo de audio desde el botón de audio.'
      : 'También puedes subir una imagen o captura desde el botón de imagen.';

  if (error instanceof DOMException) {
    if (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError'
    ) {
      return `Permiso de ${targetLabel} denegado. Habilita el acceso al ${targetLabel} en tu navegador para usarlo. ${fallbackHint}`;
    }
    if (
      error.name === 'NotFoundError' ||
      error.name === 'DevicesNotFoundError'
    ) {
      return `No se encontró un ${targetLabel} disponible en este dispositivo. ${fallbackHint}`;
    }
    if (error.name === 'NotReadableError') {
      return `El ${targetLabel} está siendo usado por otra aplicación. ${fallbackHint}`;
    }
  }
  return `No fue posible acceder al ${targetLabel}. ${fallbackHint}`;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  messages,
  onAddMessage,
  onRegisterExpense,
  onUpdateUserName,
  budgetContext,
}: AssistantDrawerProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // User name inline editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(budgetContext.userName);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const cancelRecordingFlagRef = useRef(false);

  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNameDraft(budgetContext.userName);
  }, [budgetContext.userName]);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const stopAudioStream = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  useEffect(() => {
    if (!isOpen) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        cancelRecordingFlagRef.current = true;
        mediaRecorderRef.current.stop();
      }
      stopAudioStream();
      stopCameraStream();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCameraOpen) {
          stopCameraStream();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCameraOpen, onClose]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        cancelRecordingFlagRef.current = true;
        mediaRecorderRef.current.stop();
      }
      stopAudioStream();
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [isCameraOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, messages.length, isLoading]);

  const handleSaveName = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim();
    if (cleaned) {
      onUpdateUserName(cleaned);
    } else {
      setNameDraft(budgetContext.userName);
    }
    setIsEditingName(false);
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('image/')) {
      setMediaNotice('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMediaNotice(
        'La imagen supera el tamaño máximo de 12 MB. Intenta con una más ligera.',
      );
      return;
    }

    try {
      const prepared = await prepareImageAttachment(file);
      setPendingAttachment(prepared);
    } catch (err) {
      setMediaNotice(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la imagen seleccionada.',
      );
    }
  };

  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('audio/')) {
      setMediaNotice('Por favor selecciona un archivo de audio válido.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMediaNotice(
        'El archivo de audio supera el tamaño máximo de 12 MB.',
      );
      return;
    }

    try {
      const dataUrl = await readBlobAsDataUrl(file);
      const base64 = dataUrl.split(',')[1] ?? '';
      const cleanMime = (file.type || 'audio/mpeg').split(';')[0].trim();
      setPendingAttachment({
        kind: 'audio',
        mimeType: cleanMime,
        data: base64,
        previewUrl: dataUrl,
        fileName: file.name || 'nota-de-voz.mp3',
      });
    } catch (err) {
      setMediaNotice(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el archivo de audio.',
      );
    }
  };

  const handleOpenCamera = async () => {
    if (isLoading || isRecording) return;
    setMediaNotice(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaNotice(
        'Tu navegador no permite acceso directo a la cámara. Puedes subir una imagen desde la galería.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      setMediaNotice(getFriendlyMediaError(err, 'camera'));
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const maxDim = 1600;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = dataUrl.split(',')[1] ?? '';

    stopCameraStream();
    setPendingAttachment({
      kind: 'image',
      mimeType: 'image/jpeg',
      data: base64,
      previewUrl: dataUrl,
      fileName: `recibo-${Date.now()}.jpg`,
    });
  };

  const handleStartRecording = async () => {
    if (isLoading || isRecording) return;
    setMediaNotice(null);
    if (isCameraOpen) stopCameraStream();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaNotice(
        'Tu navegador no soporta grabación de voz directa. Puedes subir un archivo de audio.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const chosenType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const recorder = chosenType
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordingFlagRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelRecordingFlagRef.current;
        const mime = (recorder.mimeType || chosenType || 'audio/webm')
          .split(';')[0]
          .trim();
        const chunks = [...audioChunksRef.current];
        stopAudioStream();

        if (wasCancelled || chunks.length === 0) return;

        try {
          const audioBlob = new Blob(chunks, { type: mime });
          if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
            setMediaNotice(
              'La nota de voz grabada supera el límite de 12 MB.',
            );
            return;
          }
          const dataUrl = await readBlobAsDataUrl(audioBlob);
          const base64 = dataUrl.split(',')[1] ?? '';
          const ext = mime.includes('mp4')
            ? 'm4a'
            : mime.includes('ogg')
              ? 'ogg'
              : 'webm';
          setPendingAttachment({
            kind: 'audio',
            mimeType: mime,
            data: base64,
            previewUrl: dataUrl,
            fileName: `nota-voz.${ext}`,
          });
        } catch {
          setMediaNotice('No se pudo procesar la nota de voz grabada.');
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      stopAudioStream();
      setMediaNotice(getFriendlyMediaError(err, 'microphone'));
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelRecordingFlagRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelRecordingFlagRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      stopAudioStream();
    }
  };

  const sendMessage = async (
    rawText: string,
    attachmentToSend: PendingAttachment | null = pendingAttachment,
  ) => {
    const trimmed = rawText.trim();
    if ((!trimmed && !attachmentToSend) || isLoading) return;

    setMediaNotice(null);

    const userMsg: AssistantMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      attachment: attachmentToSend
        ? {
            kind: attachmentToSend.kind,
            previewUrl: attachmentToSend.previewUrl,
            fileName: attachmentToSend.fileName,
          }
        : undefined,
    };

    onAddMessage(userMsg);
    setInput('');
    setPendingAttachment(null);
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => !m.isError)
        .slice(-8)
        .map((m) => {
          const mediaHint = m.attachment
            ? m.attachment.kind === 'image'
              ? `[Adjuntó imagen: ${m.attachment.fileName}]`
              : `[Adjuntó nota de voz: ${m.attachment.fileName}]`
            : '';
          const combined = [mediaHint, m.text].filter(Boolean).join(' ').trim();
          return {
            role: m.role,
            text: combined,
          };
        })
        .filter((h) => h.text.length > 0);

      const contextPayload = {
        userName: budgetContext.userName,
        monthName: budgetContext.monthName,
        currentDateISO: budgetContext.currentDateISO,
        monthlyBudget: budgetContext.monthlyBudget,
        totalIncome: budgetContext.totalIncome,
        totalSpent: budgetContext.totalSpent,
        availableBalance: budgetContext.availableBalance,
        spentPercentage: budgetContext.spentPercentage,
        recentMovements: budgetContext.recentMovements.map((m) => ({
          type: m.type,
          concept: m.concept,
          category: m.type === 'income' ? m.incomeCategory : m.category,
          amount: m.amount,
          dateLabel: m.dateLabel,
        })),
      };

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          attachment: attachmentToSend
            ? {
                kind: attachmentToSend.kind,
                mimeType: attachmentToSend.mimeType,
                data: attachmentToSend.data,
                fileName: attachmentToSend.fileName,
              }
            : undefined,
          history: historyPayload,
          budgetContext: contextPayload,
        }),
      });

      let data: {
        reply?: string;
        functionCalls?: Array<{
          name: string;
          args?: Record<string, unknown>;
        }>;
        error?: string;
        code?: number;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const errorStatus = data.code ?? response.status;
        const technicalMessage =
          data.error || `Error HTTP ${response.status} del servidor.`;

        let userFriendlyError: string;
        if (
          errorStatus === 503 ||
          technicalMessage.includes('503') ||
          technicalMessage.includes('UNAVAILABLE')
        ) {
          userFriendlyError =
            'El asistente está muy solicitado en este momento. Por favor, intenta de nuevo en un minuto.';
        } else if (
          errorStatus === 429 ||
          technicalMessage.includes('429') ||
          technicalMessage.includes('RESOURCE_EXHAUSTED')
        ) {
          userFriendlyError =
            'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
        } else {
          userFriendlyError = `Error técnico del servidor: ${technicalMessage}`;
        }

        onAddMessage({
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          text: userFriendlyError,
          isError: true,
        });
        return;
      }

      let registeredPayload: RegisterExpensePayload | undefined;
      const calls = data.functionCalls ?? [];

      for (const call of calls) {
        if (call.name === 'registerExpense' && call.args) {
          const parsedAmount = Number(call.args.amount);
          const parsedDate =
            typeof call.args.date === 'string' && call.args.date.trim()
              ? call.args.date.trim()
              : budgetContext.currentDateISO;
          const parsedDescription =
            typeof call.args.description === 'string' &&
            call.args.description.trim()
              ? call.args.description.trim()
              : 'Gasto registrado';
          const parsedCategory =
            typeof call.args.category === 'string' && call.args.category.trim()
              ? call.args.category.trim()
              : 'Alimentación';

          if (!Number.isNaN(parsedAmount) && parsedAmount > 0) {
            registeredPayload = {
              amount: Math.round(parsedAmount),
              date: parsedDate,
              description: parsedDescription,
              category: parsedCategory,
            };
            onRegisterExpense(registeredPayload);
          }
        }
      }

      const replyText =
        data.reply?.trim() ||
        (registeredPayload
          ? `¡Listo, ${budgetContext.userName}! He guardado tu gasto de ${formatCOP(registeredPayload.amount)} en ${registeredPayload.category}.`
          : 'He procesado tu solicitud.');

      onAddMessage({
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        registeredExpense: registeredPayload,
      });
    } catch (error) {
      const technical =
        error instanceof Error
          ? error.message
          : 'No fue posible conectar con el servidor.';
      onAddMessage({
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        text: `Error de conexión: ${technical}`,
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input, pendingAttachment);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="asistente-drawer-titulo"
          className="fixed inset-0 z-50 flex justify-end"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200/90 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B3DF5] text-white shadow-xs"
                  aria-hidden="true"
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    id="asistente-drawer-titulo"
                    className="text-base font-bold tracking-tight text-[#0f172a]"
                  >
                    Asistente financiero
                  </h2>
                  <p className="text-xs text-slate-500">
                    Texto, recibos en imagen o notas de voz
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Live Budget & User Name Context Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/75 px-5 py-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                {isEditingName ? (
                  <form
                    onSubmit={handleSaveName}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={32}
                      autoFocus
                      aria-label="Tu nombre"
                      placeholder="Tu nombre"
                      className="w-28 rounded-lg border border-[#5B3DF5] bg-white px-2 py-0.5 text-xs font-medium text-[#0f172a] focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Guardar nombre"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-[#5B3DF5] text-white hover:bg-[#4b2ee3]"
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(budgetContext.userName);
                        setIsEditingName(false);
                      }}
                      aria-label="Cancelar edición de nombre"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    title="Editar tu nombre"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-0.5 font-medium text-slate-600 transition-colors hover:bg-white hover:text-[#5B3DF5]"
                  >
                    <span>
                      Hola,{' '}
                      <strong className="font-semibold text-[#0f172a]">
                        {budgetContext.userName}
                      </strong>
                    </span>
                    <Pencil className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Disponible:</span>
                <span
                  className={`font-display font-bold tabular-nums ${
                    budgetContext.availableBalance >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatCOP(budgetContext.availableBalance)}
                </span>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'rounded-br-md bg-[#5B3DF5] text-white shadow-xs'
                          : msg.isError
                            ? 'rounded-bl-md border border-rose-200 bg-rose-50 text-rose-800'
                            : 'rounded-bl-md border border-slate-100 bg-slate-50 text-[#0f172a]'
                      }`}
                    >
                      {msg.isError && (
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                          <AlertCircle
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>No se pudo completar la consulta</span>
                        </div>
                      )}

                      {/* Attached Image or Audio inside User Bubble */}
                      {msg.attachment && (
                        <div className={msg.text ? 'mb-2.5' : ''}>
                          {msg.attachment.kind === 'image' ? (
                            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/10">
                              <img
                                src={msg.attachment.previewUrl}
                                alt={msg.attachment.fileName}
                                className="max-h-48 w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="rounded-xl bg-white/15 p-2">
                              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                                <FileAudio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  {msg.attachment.fileName}
                                </span>
                              </div>
                              <audio
                                controls
                                src={msg.attachment.previewUrl}
                                className="h-8 w-full min-w-[210px]"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {msg.text && (
                        <p className="whitespace-pre-line">{msg.text}</p>
                      )}

                      {/* Visual Green Check Confirmation for Function Call */}
                      {msg.registeredExpense && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-900">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-emerald-600"
                              aria-hidden="true"
                            />
                            <span>Gasto registrado en el dashboard</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5 text-emerald-800 tabular-nums">
                            <p className="font-semibold">
                              {msg.registeredExpense.description} ·{' '}
                              {formatCOP(msg.registeredExpense.amount)}
                            </p>
                            <p className="text-[11px] text-emerald-700">
                              {msg.registeredExpense.category} ·{' '}
                              {msg.registeredExpense.date}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator ('escribiendo...' dots animation) */}
              {isLoading && (
                <div className="flex items-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    <span>escribiendo</span>
                    <span
                      className="inline-flex items-center gap-1"
                      aria-hidden="true"
                    >
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B3DF5] [animation-delay:-0.25s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B3DF5] [animation-delay:-0.12s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B3DF5]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Prompts (shown when conversation is fresh) */}
            {messages.length <= 1 &&
              !isLoading &&
              !pendingAttachment &&
              !isCameraOpen &&
              !isRecording && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">
                    Prueba diciendo o sube un recibo / nota de voz:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => void sendMessage(sample, null)}
                        className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#5B3DF5] hover:text-[#5B3DF5]"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Media / Permission Error Notice */}
            {mediaNotice && (
              <div
                role="alert"
                className="flex items-start justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <span>{mediaNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaNotice(null)}
                  aria-label="Cerrar aviso"
                  className="cursor-pointer rounded p-0.5 text-amber-700 hover:bg-amber-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Live Camera Viewfinder */}
            {isCameraOpen && (
              <div className="border-t border-slate-200 bg-slate-950 p-3">
                <div className="overflow-hidden rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-52 w-full object-cover"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="cursor-pointer rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#5B3DF5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4b2ee3]"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Capturar recibo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pending Attachment Preview */}
            {pendingAttachment && !isCameraOpen && (
              <div className="border-t border-slate-100 bg-indigo-50/50 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white p-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {pendingAttachment.kind === 'image' ? (
                      <img
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.fileName}
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[#5B3DF5]">
                        <FileAudio className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#0f172a]">
                        {pendingAttachment.fileName}
                      </p>
                      {pendingAttachment.kind === 'image' ? (
                        <p className="text-[11px] text-slate-500">
                          Imagen lista para analizar
                        </p>
                      ) : (
                        <audio
                          controls
                          src={pendingAttachment.previewUrl}
                          className="mt-1 h-7 w-full"
                        />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Quitar archivo adjunto"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleImageFileChange(e)}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => void handleAudioFileChange(e)}
              className="hidden"
            />

            {/* Composer / Recording Bar */}
            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
              {isRecording ? (
                <div className="flex items-center justify-between gap-3 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                    <span
                      className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600"
                      aria-hidden="true"
                    />
                    <span>
                      Grabando nota de voz ·{' '}
                      <span className="tabular-nums">
                        {formatRecordingTimer(recordingSeconds)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCancelRecording}
                      aria-label="Cancelar grabación"
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      aria-label="Detener grabación y adjuntar"
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full bg-[#5B3DF5] px-3 text-xs font-semibold text-white hover:bg-[#4b2ee3]"
                    >
                      <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>Listo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* Multimodal Quick Tools Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isLoading}
                        title="Subir imagen de ticket o recibo"
                        aria-label="Subir imagen de ticket o recibo"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#5B3DF5] hover:bg-indigo-50/50 hover:text-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Imagen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleOpenCamera()}
                        disabled={isLoading}
                        title="Tomar foto de recibo con la cámara"
                        aria-label="Tomar foto con la cámara"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#5B3DF5] hover:bg-indigo-50/50 hover:text-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Cámara</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleStartRecording()}
                        disabled={isLoading}
                        title="Grabar nota de voz"
                        aria-label="Grabar nota de voz"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#5B3DF5] hover:bg-indigo-50/50 hover:text-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Voz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isLoading}
                        title="Cargar archivo de audio"
                        aria-label="Cargar archivo de audio"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#5B3DF5] hover:bg-indigo-50/50 hover:text-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FileAudio className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Audio</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      placeholder={
                        pendingAttachment
                          ? 'Añade un comentario opcional o envía...'
                          : 'Escribe, sube un recibo o graba voz...'
                      }
                      aria-label="Escribe un gasto o pregunta sobre tu presupuesto"
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={
                        isLoading || (!input.trim() && !pendingAttachment)
                      }
                      aria-label="Enviar mensaje"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#5B3DF5] text-white shadow-sm transition-all hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
