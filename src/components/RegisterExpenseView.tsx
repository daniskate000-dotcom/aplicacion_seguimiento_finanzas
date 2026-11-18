import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  CATEGORY_LIST,
  CURRENT_DAY_OF_MONTH,
  formatCOP,
  formatDayDateLabel,
} from '../data/budgetData';
import { ExpenseCategory, ExpenseRecord } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

interface RegisterExpenseViewProps {
  onSaveExpense: (expense: ExpenseRecord) => void;
  onCancel: () => void;
}

interface FormErrors {
  amount?: string;
  category?: string;
  concept?: string;
  date?: string;
}

const QUICK_AMOUNT_PRESETS = [15000, 25000, 50000, 100000];

function formatCurrentTimeES(): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return 'Ahora';
  }
}

export function RegisterExpenseView({
  onSaveExpense,
  onCancel,
}: RegisterExpenseViewProps) {
  const [amountInput, setAmountInput] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [concept, setConcept] = useState('');
  const [dateValue, setDateValue] = useState(
    `2026-11-${String(CURRENT_DAY_OF_MONTH).padStart(2, '0')}`,
  );
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const parsedAmount = Number(amountInput.replace(/\D/g, ''));

  const handleAmountChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 9);
    setAmountInput(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handlePresetClick = (presetAmount: number) => {
    setAmountInput(String(presetAmount));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: FormErrors = {};

    if (!amountInput || Number.isNaN(parsedAmount) || parsedAmount < 100) {
      nextErrors.amount = 'Ingresa un monto válido igual o mayor a $100 COP.';
    } else if (parsedAmount > 50000000) {
      nextErrors.amount = 'El monto no puede superar $50.000.000 COP.';
    }

    if (!selectedCategory) {
      nextErrors.category = 'Selecciona una categoría para el gasto.';
    }

    const trimmedConcept = concept.trim();
    if (trimmedConcept.length < 2) {
      nextErrors.concept =
        'Escribe un concepto breve de al menos 2 caracteres.';
    }

    const dateParts = dateValue.split('-');
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);

    if (
      dateParts.length !== 3 ||
      year !== 2026 ||
      month !== 11 ||
      Number.isNaN(day) ||
      day < 1 ||
      day > 30
    ) {
      nextErrors.date = 'Selecciona una fecha válida dentro de noviembre 2026.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now().toString().slice(-4)}`,
      type: 'expense',
      day,
      dateLabel: formatDayDateLabel(day),
      timeLabel: formatCurrentTimeES(),
      concept: trimmedConcept,
      category: selectedCategory as ExpenseCategory,
      amount: parsedAmount,
      note: note.trim() || undefined,
    };

    onSaveExpense(newExpense);
  };

  return (
    <section
      aria-labelledby="registrar-gasto-titulo"
      className="mx-auto max-w-xl rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-8"
    >
      {/* Top Bar */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5B3DF5] hover:text-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Volver</span>
        </button>

        <h2
          id="registrar-gasto-titulo"
          className="text-xl font-bold tracking-tight text-[#0f172a]"
        >
          Registrar nuevo gasto
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Anota tu pago en segundos para actualizar tu saldo disponible al instante.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {/* 1. Monto */}
        <div>
          <label
            htmlFor="expense-amount"
            className="block text-sm font-semibold text-[#0f172a]"
          >
            ¿Cuánto pagaste? (COP)
          </label>
          <div className="relative mt-2">
            <span
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-xl font-bold text-slate-400"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Ej. 35000"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'amount-error' : 'amount-preview'}
              className={`w-full rounded-2xl border py-3.5 pr-16 pl-9 font-display text-2xl font-bold text-[#0f172a] tabular-nums placeholder:text-slate-300 focus:outline-none ${
                errors.amount
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
              }`}
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
              COP
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p id="amount-preview" className="text-xs text-slate-500 tabular-nums">
              {parsedAmount > 0
                ? `Valor a registrar: ${formatCOP(parsedAmount)}`
                : 'Ingresa solo números sin puntos ni comas'}
            </p>
          </div>

          {/* Quick-tap preset amounts */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {QUICK_AMOUNT_PRESETS.map((preset) => {
              const isMatch = parsedAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                    isMatch
                      ? 'bg-[#0f172a] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {formatCOP(preset).replace(' COP', '')}
                </button>
              );
            })}
          </div>

          {errors.amount && (
            <p
              id="amount-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-rose-600"
            >
              {errors.amount}
            </p>
          )}
        </div>

        {/* 2. Categoría */}
        <div>
          <span className="block text-sm font-semibold text-[#0f172a]">
            Categoría
          </span>
          <div
            role="radiogroup"
            aria-label="Selecciona la categoría del gasto"
            className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (errors.category) {
                      setErrors((prev) => ({ ...prev, category: undefined }));
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                    isSelected
                      ? 'border-[#5B3DF5] bg-indigo-50/70 ring-1 ring-[#5B3DF5]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <CategoryIcon category={cat.id} size="sm" />
                  <span className="text-xs font-semibold text-[#0f172a] sm:text-[13px]">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
              {errors.category}
            </p>
          )}
        </div>

        {/* 3. Concepto */}
        <div>
          <label
            htmlFor="expense-concept"
            className="block text-sm font-semibold text-[#0f172a]"
          >
            Concepto del gasto
          </label>
          <input
            id="expense-concept"
            type="text"
            maxLength={65}
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              if (errors.concept) {
                setErrors((prev) => ({ ...prev, concept: undefined }));
              }
            }}
            placeholder="Ej. Almuerzo corriente, pasaje, café..."
            aria-invalid={Boolean(errors.concept)}
            aria-describedby={errors.concept ? 'concept-error' : undefined}
            className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:outline-none ${
              errors.concept
                ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
            }`}
          />
          {errors.concept && (
            <p
              id="concept-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-rose-600"
            >
              {errors.concept}
            </p>
          )}
        </div>

        {/* 4. Fecha & Nota opcional */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="expense-date"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Fecha
            </label>
            <input
              id="expense-date"
              type="date"
              min="2026-11-01"
              max="2026-11-30"
              value={dateValue}
              onChange={(e) => {
                setDateValue(e.target.value);
                if (errors.date) {
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.date)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#0f172a] tabular-nums focus:outline-none ${
                errors.date
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
              }`}
            />
            {errors.date && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-note"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Nota breve <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="expense-note"
              type="text"
              maxLength={80}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Pago en efectivo"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Guardar gasto</span>
          </button>
        </div>
      </form>
    </section>
  );
}
