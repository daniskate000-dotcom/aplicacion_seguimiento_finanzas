import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Content,
  FunctionDeclaration,
  GoogleGenAI,
  Part,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Prioritized active models (non-deprecated, free-tier compatible)
const MODEL_CASCADE = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const registerExpenseDeclaration: FunctionDeclaration = {
  name: 'registerExpense',
  description:
    'Registra un gasto en pesos colombianos (COP) cuando el usuario indica que pagó, compró o gastó dinero.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          'Monto del gasto en pesos colombianos (COP). Debe ser un número positivo sin símbolos ni puntos de miles.',
      },
      date: {
        type: Type.STRING,
        description:
          'Fecha del gasto en formato YYYY-MM-DD. Si el usuario dice "hoy", usa la fecha actual del contexto.',
      },
      description: {
        type: Type.STRING,
        description:
          'Descripción o concepto breve del gasto (ej. Almuerzo, Café, Pasaje, Mercado).',
      },
      category: {
        type: Type.STRING,
        description:
          'Categoría del gasto. Elige exactamente una de: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio".',
      },
    },
    required: ['amount', 'date', 'description', 'category'],
  },
};

interface ExtractedFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

interface BudgetContextPayload {
  userName?: string;
  monthName: string;
  currentDateISO: string;
  monthlyBudget: number;
  totalIncome: number;
  totalSpent: number;
  availableBalance: number;
  spentPercentage: number;
  recentMovements: Array<{
    type: 'expense' | 'income';
    concept: string;
    category: string;
    amount: number;
    dateLabel: string;
  }>;
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface MediaAttachmentPayload {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string; // base64 without data URL prefix
  fileName?: string;
}

function normalizeMimeType(rawMimeType: string, kind: 'image' | 'audio'): string {
  const base = rawMimeType.split(';')[0].trim().toLowerCase();
  if (!base) {
    return kind === 'image' ? 'image/jpeg' : 'audio/webm';
  }
  if (base === 'audio/x-m4a' || base === 'audio/m4a') return 'audio/mp4';
  if (base === 'audio/x-wav') return 'audio/wav';
  if (base === 'audio/mp3') return 'audio/mpeg';
  if (base === 'image/jpg') return 'image/jpeg';
  return base;
}

function getErrorStatusCode(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: number;
      code?: number;
      statusCode?: number;
      message?: string;
    };
    if (typeof errObj.status === 'number') return errObj.status;
    if (typeof errObj.statusCode === 'number') return errObj.statusCode;
    if (typeof errObj.code === 'number') return errObj.code;

    const msg = String(errObj.message ?? '');
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return 429;
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) return 503;
    if (msg.includes('404') || msg.includes('NOT_FOUND')) return 404;
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return 403;
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) return 400;
  }
  return 500;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido al comunicarse con el servicio de IA.';
}

function isRetryableCascadeStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 404;
}

function formatCOPServer(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0 ? '-' : ''}$${formatted} COP`;
}

function extractPartsFromResponse(parts: Part[] | undefined): {
  text: string;
  functionCalls: ExtractedFunctionCall[];
} {
  const textSegments: string[] = [];
  const functionCalls: ExtractedFunctionCall[] = [];

  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (typeof part.text === 'string' && part.text.trim().length > 0) {
        textSegments.push(part.text.trim());
      }
      if (part.functionCall && typeof part.functionCall.name === 'string') {
        functionCalls.push({
          id: part.functionCall.id,
          name: part.functionCall.name,
          args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
    }
  }

  return {
    text: textSegments.join('\n').trim(),
    functionCalls,
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        code: 500,
        error:
          'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Settings > Secrets.',
      });
      return;
    }

    const {
      message = '',
      attachment,
      history = [],
      budgetContext,
    } = req.body as {
      message?: string;
      attachment?: MediaAttachmentPayload;
      history?: ChatHistoryMessage[];
      budgetContext?: BudgetContextPayload;
    };

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const hasAttachment = Boolean(
      attachment &&
        typeof attachment.data === 'string' &&
        attachment.data.trim().length > 0 &&
        (attachment.kind === 'image' || attachment.kind === 'audio'),
    );

    if (!trimmedMessage && !hasAttachment) {
      res.status(400).json({
        code: 400,
        error:
          'Debes escribir un mensaje o adjuntar una imagen o nota de voz.',
      });
      return;
    }

    const currentDateISO = budgetContext?.currentDateISO ?? '2026-11-17';
    const userName = budgetContext?.userName?.trim() || 'Usuario';
    const budgetSummaryText = budgetContext
      ? [
          `Nombre del usuario: ${userName}`,
          `Mes actual: ${budgetContext.monthName}`,
          `Fecha actual: ${currentDateISO}`,
          `Presupuesto mensual disponible total: ${formatCOPServer(budgetContext.monthlyBudget)}`,
          `Total ingresos adicionales: ${formatCOPServer(budgetContext.totalIncome)}`,
          `Total gastado hasta ahora: ${formatCOPServer(budgetContext.totalSpent)} (${budgetContext.spentPercentage.toFixed(1)}%)`,
          `Saldo disponible restante: ${formatCOPServer(budgetContext.availableBalance)}`,
          budgetContext.recentMovements.length > 0
            ? `Últimos movimientos: ${budgetContext.recentMovements
                .map(
                  (m) =>
                    `${m.type === 'income' ? '+' : '-'}${formatCOPServer(m.amount)} en ${m.concept} (${m.category}, ${m.dateLabel})`,
                )
                .join('; ')}`
            : 'Últimos movimientos: aún no hay movimientos registrados este mes.',
        ].join('\n')
      : [`Nombre del usuario: ${userName}`, `Fecha actual: ${currentDateISO}`].join(
          '\n',
        );

    const systemInstruction = [
      // Instrucciones originales preservadas intactas
      'Eres el asistente financiero personal integrado en "Mi Presupuesto Mensual".',
      'Tu tono es breve, amable, claro y experto en finanzas personales en Colombia (moneda: pesos colombianos COP).',
      'Siempre responde en español.',
      'Cuando el usuario mencione un gasto que realizó (ej. "Gasté 500 en comida hoy", "Pagué 35 mil de almuerzo", "Compré unos tenis por 125.000"), extrae amount (número positivo en COP), date (YYYY-MM-DD, usando la fecha actual si dice "hoy"), description (concepto breve) y category (una de: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio") y llama inmediatamente a la función registerExpense.',
      'Confirma de forma breve y amable los datos del gasto que estás registrando o consulta el estado del presupuesto si el usuario hace preguntas financieras.',
      'Si el usuario dice un monto ambiguo o sin monto (ej. "compré comida"), pide brevemente el valor en COP antes de llamar a registerExpense.',
      // Extensión multimodal y reglas de registro
      'Imagen: permite analizar tickets, recibos, capturas de compra o apuntes de gasto. Al recibir un ticket, recibo, captura o apunte, extrae: monto, fecha y descripción (e infiere la categoría más acorde). Si la imagen es borrosa, algún dato no se ve, está dudoso o faltan datos, pregunta al usuario antes de guardar; NO inventes información.',
      'Audio: al recibir una nota de voz o archivo de audio, transcríbela y extrae monto, fecha y descripción del gasto. Incluye brevemente la transcripción en tu respuesta. Si falta algún dato o no se entiende con claridad, solicita aclaración al usuario antes de guardar; NO inventes datos.',
      'Validación: Si la imagen o el audio no tiene que ver con gastos o finanzas de Mi Presupuesto, indica claramente que no puedes procesarlo ni registrarlo.',
      'Reglas de Registro:',
      '- Usa siempre la herramienta registerExpense para guardar datos confirmados.',
      `- Al finalizar un registro, dirígete al usuario por su nombre (ej: "¡Listo, ${userName}! He guardado tu gasto").`,
      '- Para consultas de compras, compara el gasto solicitado con el saldo disponible en el contexto e indica si alcanza y cuánto saldo quedaría.',
      'Contexto Dinámico: Siempre utiliza la fecha actual, el nombre del usuario y el saldo disponible proporcionados en cada mensaje.',
      '',
      'Contexto financiero actual del usuario:',
      budgetSummaryText,
    ].join('\n');

    const userParts: Part[] = [];
    if (hasAttachment && attachment) {
      userParts.push({
        inlineData: {
          mimeType: normalizeMimeType(attachment.mimeType, attachment.kind),
          data: attachment.data,
        },
      });
    }

    const defaultAttachmentPrompt =
      hasAttachment && attachment?.kind === 'image'
        ? 'Analiza esta imagen (ticket, recibo, captura de compra o apunte). Si corresponde a un gasto y los datos (monto, fecha y descripción) son claros, regístralo; si es borrosa o falta algún dato, pregunta antes de guardar; si no trata de gastos o finanzas, indica que no puedes registrarlo.'
        : hasAttachment && attachment?.kind === 'audio'
          ? 'Transcribe esta nota de voz y extrae monto, fecha y descripción del gasto. Si todos los datos están claros, regístralo; si falta algún dato, pide aclaración antes de guardar; si no tiene que ver con gastos de Mi Presupuesto, indica que no puedes registrarlo.'
          : '';

    userParts.push({
      text: trimmedMessage || defaultAttachmentPrompt,
    });

    const contents: Content[] = [
      ...history
        .filter((h) => h.text && h.text.trim().length > 0)
        .slice(-8)
        .map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
      {
        role: 'user',
        parts: userParts,
      },
    ];

    let lastStatus = 500;
    let lastErrorMessage = 'Error inesperado al consultar Gemini.';

    for (const modelName of MODEL_CASCADE) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [registerExpenseDeclaration] }],
          },
        });

        // Robust extraction directly from response.candidates[0].content.parts
        const candidateParts = response.candidates?.[0]?.content?.parts;
        const extracted = extractPartsFromResponse(candidateParts);

        // Secondary safeguard if response.functionCalls exists without parts
        if (
          extracted.functionCalls.length === 0 &&
          Array.isArray(response.functionCalls) &&
          response.functionCalls.length > 0
        ) {
          for (const fc of response.functionCalls) {
            if (fc.name) {
              extracted.functionCalls.push({
                id: fc.id,
                name: fc.name,
                args: (fc.args ?? {}) as Record<string, unknown>,
              });
            }
          }
        }

        const replyText =
          extracted.text ||
          (typeof response.text === 'string' ? response.text.trim() : '');

        res.json({
          reply: replyText,
          functionCalls: extracted.functionCalls,
          modelUsed: modelName,
        });
        return;
      } catch (error) {
        const status = getErrorStatusCode(error);
        const errMsg = getErrorMessage(error);
        lastStatus = status;
        lastErrorMessage = errMsg;

        console.warn(
          `[Assistant] Modelo ${modelName} falló con código ${status}: ${errMsg}`,
        );

        if (isRetryableCascadeStatus(status)) {
          continue;
        }

        res.status(status).json({
          code: status,
          error: errMsg,
        });
        return;
      }
    }

    res.status(lastStatus).json({
      code: lastStatus,
      error: lastErrorMessage,
    });
  });

  if (IS_PRODUCTION) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
