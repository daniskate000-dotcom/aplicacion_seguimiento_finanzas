import { FormEvent, useState } from 'react';
import { AlertCircle, LogOut, Sparkles, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCOP } from '../data/budgetData';

interface OnboardingBudgetModalProps {
  initialName: string;
  userEmail: string | null;
  onConfirmBudget: (displayName: string, monthlyBudget: number) => Promise<void>;
  onSignOut: () => Promise<void>;
}

const PRESET_BUDGETS = [1500000, 2500000, 3200000, 5000000];

export function OnboardingBudgetModal({
  initialName,
  userEmail,
  onConfirmBudget,
  onSignOut,
}: OnboardingBudgetModalProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [rawDigits, setRawDigits] = useState('3200000');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numericValue = Number(rawDigits) || 0;
  const formattedPreview =
    numericValue > 0 ? formatCOP(numericValue) : '$0 COP';

  const handleAmountInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setRawDigits(digitsOnly);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numericValue <= 0) {
      setErrorMessage(
        'Ingresa un presupuesto mensual mayor a $0 COP para comenzar.',
      );
      return;
    }

    const cleanedName = displayName.trim() || 'Usuario';
    setIsSaving(true);
    try {
      await onConfirmBudget(cleanedName, numericValue);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No pudimos guardar tu presupuesto inicial. Intenta de nuevo.',
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-[28px] border border-white/90 bg-white/95 p-6 shadow-[0_22px_60px_-18px_rgba(67,56,202,0.2)] backdrop-blur-sm sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#5B3DF5] text-white shadow-[0_8px_22px_-6px_rgba(91,61,245,0.5)]"
              aria-hidden="true"
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#5B3DF5]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Cuenta nueva desde cero
              </span>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-[#1e1b4b] sm:text-2xl">
                ¿Cuál es tu presupuesto mensual?
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSignOut()}
            title="Cambiar de cuenta"
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {userEmail ? (
            <>
              Has ingresado con{' '}
              <strong className="font-semibold text-slate-700">
                {userEmail}
              </strong>
              . Define cuánto dinero planeas destinar este mes para empezar con
              tu tablero en cero.
            </>
          ) : (
            'Define cuánto dinero planeas destinar este mes para empezar con tu tablero financiero desde cero.'
          )}
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="onboarding-name"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              ¿Cómo quieres que te llamemos?
            </label>
            <input
              id="onboarding-name"
              type="text"
              required
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Daniel"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="onboarding-budget"
                className="text-xs font-semibold text-slate-700"
              >
                Presupuesto mensual (COP)
              </label>
              <span className="font-display text-xs font-bold text-[#5B3DF5] tabular-nums">
                {formattedPreview}
              </span>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-base font-bold text-slate-400">
                $
              </span>
              <input
                id="onboarding-budget"
                type="text"
                inputMode="numeric"
                required
                value={
                  rawDigits
                    ? Number(rawDigits)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                    : ''
                }
                onChange={(e) => handleAmountInput(e.target.value)}
                placeholder="3.200.000"
                className="font-display h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pr-14 pl-9 text-lg font-bold text-[#0f172a] tabular-nums placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold text-slate-400">
                COP
              </span>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRESET_BUDGETS.map((preset) => {
                const isSelected = numericValue === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRawDigits(String(preset));
                      setErrorMessage(null);
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                      isSelected
                        ? 'border-[#5B3DF5] bg-[#5B3DF5] text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#5B3DF5] hover:text-[#5B3DF5]'
                    }`}
                  >
                    {formatCOP(preset)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#5B3DF5] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'Guardando tu presupuesto...'
              : 'Guardar presupuesto y comenzar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
