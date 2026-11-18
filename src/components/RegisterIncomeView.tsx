import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CURRENT_DAY_OF_MONTH,
  formatCOP,
  formatDayDateLabel,
  formatShortCOP,
  formatSpanishDateFromISO,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from '../data/budgetData';
import {
  IncomeCategory,
  IncomeRecord,
  PaymentMethod,
} from '../types/budget';

interface RegisterIncomeViewProps {
  onSaveIncome: (income: IncomeRecord) => void;
  onCancel: () => void;
}

interface IncomeFormErrors {
  amount?: string;
  description?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
}

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

export function RegisterIncomeView({
  onSaveIncome,
  onCancel,
}: RegisterIncomeViewProps) {
  const [rawDigits, setRawDigits] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncomeCategory | ''>('Salario');
  const [dateValue, setDateValue] = useState(
    `2026-11-${String(CURRENT_DAY_OF_MONTH).padStart(2, '0')}`,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(
    'Cuenta bancaria',
  );
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<IncomeFormErrors>({});
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const numericAmount = rawDigits ? Number(rawDigits) : 0;
  const formattedInputDisplay = rawDigits
    ? formatShortCOP(numericAmount)
    : '';

  const handleAmountChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setRawDigits(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSavedSuccess) return;

    const nextErrors: IncomeFormErrors = {};

    if (!rawDigits || Number.isNaN(numericAmount) || numericAmount <= 0) {
      nextErrors.amount =
        'Por favor ingresa un valor mayor a $0 COP (no se permiten valores negativos o en cero).';
    } else if (numericAmount > 500000000) {
      nextErrors.amount = 'El valor del ingreso supera el límite permitido.';
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 2) {
      nextErrors.description =
        'Escribe una descripción breve del ingreso (ej. Salario, Freelance).';
    }

    if (!category) {
      nextErrors.category = 'Selecciona una categoría de ingreso.';
    }

    const dateParts = dateValue.split('-');
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);

    if (
      dateParts.length !== 3 ||
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      day < 1 ||
      day > 31
    ) {
      nextErrors.date = 'Selecciona una fecha válida para el ingreso.';
    }

    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Selecciona el medio de pago recibido.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const newIncome: IncomeRecord = {
      id: `inc-${Date.now().toString().slice(-4)}`,
      type: 'income',
      day: year === 2026 && month === 11 ? day : CURRENT_DAY_OF_MONTH,
      dateLabel:
        year === 2026 && month === 11
          ? formatDayDateLabel(day)
          : formatSpanishDateFromISO(dateValue),
      fullDateText: formatSpanishDateFromISO(dateValue),
      timeLabel: formatCurrentTimeES(),
      concept: trimmedDesc,
      incomeCategory: category as IncomeCategory,
      paymentMethod: paymentMethod as PaymentMethod,
      amount: numericAmount,
      note: notes.trim() || undefined,
    };

    setIsSavedSuccess(true);
    timerRef.current = window.setTimeout(() => {
      onSaveIncome(newIncome);
    }, 650);
  };

  return (
    <section
      aria-labelledby="registrar-ingreso-titulo"
      className="mx-auto max-w-2xl rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-8"
    >
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5B3DF5] transition-colors hover:text-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Volver al Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg"
            aria-hidden="true"
          >
            💰
          </div>
          <div>
            <h2
              id="registrar-ingreso-titulo"
              className="text-xl font-bold tracking-tight text-[#0f172a]"
            >
              Registrar Nuevo Ingreso
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Registra cualquier ingreso recibido este mes para aumentar automáticamente tu presupuesto disponible.
            </p>
          </div>
        </div>
      </div>

      {/* Animated Save Confirmation State */}
      {isSavedSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="my-8 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-6 text-center"
        >
          <p className="font-display text-lg font-bold text-emerald-800">
            ✅ Ingreso registrado correctamente.
          </p>
          <p className="mt-1.5 text-sm text-emerald-700 tabular-nums">
            +{formatCOP(numericAmount)} sumados a tu presupuesto disponible.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {/* 1. Valor del ingreso (obligatorio, formato COP automático mientras escribe) */}
          <div>
            <label
              htmlFor="income-amount"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Valor del ingreso <span className="text-rose-600">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="income-amount"
                type="text"
                inputMode="numeric"
                autoFocus
                value={formattedInputDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="$850.000"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={
                  errors.amount ? 'income-amount-error' : 'income-amount-help'
                }
                className={`w-full rounded-2xl border py-3.5 pr-16 pl-4 font-display text-2xl font-bold text-[#0f172a] tabular-nums placeholder:text-slate-300 focus:outline-none ${
                  errors.amount
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
                }`}
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                COP
              </span>
            </div>
            <p
              id="income-amount-help"
              className="mt-1.5 text-xs text-slate-500 tabular-nums"
            >
              {numericAmount > 0
                ? `Formato colombiano: ${formatCOP(numericAmount)}`
                : 'Se formatea automáticamente en pesos colombianos (COP) mientras escribes.'}
            </p>
            {errors.amount && (
              <p
                id="income-amount-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-rose-600"
              >
                {errors.amount}
              </p>
            )}
          </div>

          {/* 2. Descripción */}
          <div>
            <label
              htmlFor="income-description"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Descripción <span className="text-rose-600">*</span>
            </label>
            <input
              id="income-description"
              type="text"
              maxLength={70}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="Ej. Salario, Freelance, Venta de computador, Bonificación, Reembolso"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? 'income-description-error' : undefined
              }
              className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:outline-none ${
                errors.description
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
              }`}
            />
            {errors.description && (
              <p
                id="income-description-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-rose-600"
              >
                {errors.description}
              </p>
            )}
          </div>

          {/* 3. Categoría & 4. Fecha del ingreso */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="income-category"
                className="block text-sm font-semibold text-[#0f172a]"
              >
                Categoría <span className="text-rose-600">*</span>
              </label>
              <select
                id="income-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as IncomeCategory);
                  if (errors.category) {
                    setErrors((prev) => ({ ...prev, category: undefined }));
                  }
                }}
                aria-invalid={Boolean(errors.category)}
                className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none ${
                  errors.category
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {INCOME_CATEGORIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-rose-600"
                >
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="income-date"
                className="block text-sm font-semibold text-[#0f172a]"
              >
                Fecha del ingreso <span className="text-rose-600">*</span>
              </label>
              <input
                id="income-date"
                type="date"
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
                <p
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-rose-600"
                >
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* 5. Medio de pago */}
          <div>
            <label
              htmlFor="income-payment-method"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Medio de pago <span className="text-rose-600">*</span>
            </label>
            <select
              id="income-payment-method"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value as PaymentMethod);
                if (errors.paymentMethod) {
                  setErrors((prev) => ({
                    ...prev,
                    paymentMethod: undefined,
                  }));
                }
              }}
              aria-invalid={Boolean(errors.paymentMethod)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none ${
                errors.paymentMethod
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 bg-slate-50/60 focus:border-[#5B3DF5] focus:bg-white'
              }`}
            >
              <option value="">Selecciona un medio de pago</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p
                role="alert"
                className="mt-1.5 text-xs font-medium text-rose-600"
              >
                {errors.paymentMethod}
              </p>
            )}
          </div>

          {/* 6. Observaciones (opcional multiline) */}
          <div>
            <label
              htmlFor="income-notes"
              className="block text-sm font-semibold text-[#0f172a]"
            >
              Observaciones{' '}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="income-notes"
              rows={3}
              maxLength={240}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega cualquier detalle adicional sobre este ingreso..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.6)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Guardar ingreso</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
