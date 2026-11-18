import { useState, FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Pencil,
  ReceiptText,
  Wallet,
  X,
} from 'lucide-react';
import {
  formatCOP,
  formatPercentage,
  formatShortCOP,
} from '../data/budgetData';

interface FinancialSummaryProps {
  monthName: string;
  currentDay: number;
  totalDays: number;
  remainingDays: number;
  baseMonthlyBudget: number;
  totalIncome: number;
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  spentPercentage: number;
  availablePercentage: number;
  dailyAverageSpent: number;
  dailyAvailableMargin: number;
  onUpdateBudget: (newBaseBudget: number) => void;
}

export function FinancialSummary({
  monthName,
  currentDay,
  totalDays,
  remainingDays,
  baseMonthlyBudget,
  totalIncome,
  monthlyBudget,
  totalSpent,
  availableBalance,
  spentPercentage,
  availablePercentage,
  dailyAverageSpent,
  dailyAvailableMargin,
  onUpdateBudget,
}: FinancialSummaryProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(baseMonthlyBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const isPositiveBalance = availableBalance >= 0;
  const isWarning = isPositiveBalance && spentPercentage >= 85;
  const clampedSpentWidth = Math.min(100, Math.max(0, spentPercentage));
  const clampedAvailableWidth = Math.max(0, 100 - clampedSpentWidth);

  const startEditing = () => {
    setBudgetDraft(String(baseMonthlyBudget));
    setBudgetError(null);
    setIsEditingBudget(true);
  };

  const cancelEditing = () => {
    setIsEditingBudget(false);
    setBudgetError(null);
  };

  const handleSaveBudget = (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(budgetDraft.replace(/\D/g, ''));
    if (!budgetDraft || Number.isNaN(numeric) || numeric < 10000) {
      setBudgetError('Ingresa un monto igual o mayor a $10.000 COP.');
      return;
    }
    if (numeric > 100000000) {
      setBudgetError('El presupuesto máximo permitido es $100.000.000 COP.');
      return;
    }
    onUpdateBudget(numeric);
    setIsEditingBudget(false);
    setBudgetError(null);
  };

  const parsedDraft = Number(budgetDraft.replace(/\D/g, ''));

  return (
    <section
      aria-labelledby="resumen-financiero-titulo"
      className="rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-7"
    >
      {/* Top Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="resumen-financiero-titulo"
          className="text-lg font-bold tracking-tight text-[#0f172a] sm:text-[1.35rem]"
        >
          Resumen financiero del mes
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
          <Wallet className="h-4 w-4 shrink-0 text-[#1e1b4b]" aria-hidden="true" />
          <span>Saldo disponible = Presupuesto disponible − Gastos registrados</span>
        </div>
      </div>

      {/* Three Metric Cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 1. Saldo disponible */}
        <div
          className={`rounded-2xl border p-5 shadow-[0_6px_24px_-10px_rgba(79,70,229,0.14)] transition-colors ${
            isPositiveBalance
              ? 'border-slate-100 bg-white'
              : 'border-rose-200 bg-rose-50/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isPositiveBalance
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
                aria-hidden="true"
              >
                <Wallet className="h-[18px] w-[18px]" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Saldo disponible
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                isPositiveBalance
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isPositiveBalance
                ? `${formatPercentage(availablePercentage)} libre`
                : 'Saldo agotado'}
            </span>
          </div>

          <p
            className={`mt-3.5 font-display text-[1.75rem] font-extrabold tracking-tight tabular-nums sm:text-[2rem] ${
              isPositiveBalance ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatShortCOP(availableBalance)}{' '}
            <span className="text-base font-bold sm:text-lg">COP</span>
          </p>

          <p className="mt-2 text-xs leading-relaxed text-slate-500 tabular-nums sm:text-[13px]">
            {isPositiveBalance
              ? remainingDays > 0
                ? `Margen de ${formatShortCOP(dailyAvailableMargin)} COP por día (${remainingDays} días restantes)`
                : 'Cierre de mes'
              : `Excedido por ${formatShortCOP(Math.abs(availableBalance))} COP`}
          </p>
        </div>

        {/* 2. Presupuesto disponible (Base editable + Ingresos registrados) */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_-10px_rgba(79,70,229,0.14)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"
                aria-hidden="true"
              >
                <Calendar className="h-[18px] w-[18px]" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Presupuesto mensual
              </span>
            </div>

            {!isEditingBudget && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 whitespace-nowrap shrink-0 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <form onSubmit={handleSaveBudget} className="mt-3">
              <div className="relative">
                <span
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-display text-base font-bold text-slate-400"
                  aria-hidden="true"
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={budgetDraft}
                  onChange={(e) => {
                    setBudgetDraft(e.target.value.replace(/\D/g, '').slice(0, 9));
                    if (budgetError) setBudgetError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  aria-label="Nuevo presupuesto base mensual en COP"
                  className="w-full rounded-xl border border-sky-300 bg-sky-50/40 py-2 pr-12 pl-7 font-display text-lg font-bold text-[#0f172a] tabular-nums focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                  COP
                </span>
              </div>

              {budgetError ? (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {budgetError}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                  {parsedDraft > 0
                    ? `Base: ${formatCOP(parsedDraft)}`
                    : 'Ingresa el monto base mensual'}
                </p>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#5B3DF5] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-3.5 font-display text-[1.75rem] font-extrabold tracking-tight text-[#0f172a] tabular-nums sm:text-[2rem]">
                {formatShortCOP(monthlyBudget)}{' '}
                <span className="text-base font-bold sm:text-lg">COP</span>
              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 tabular-nums sm:text-[13px]">
                {totalIncome > 0
                  ? `Base ${formatShortCOP(baseMonthlyBudget)} + ${formatShortCOP(totalIncome)} en ingresos`
                  : `Límite editable para ${monthName.toLowerCase()}`}
              </p>
            </>
          )}
        </div>

        {/* 3. Total gastado */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_-10px_rgba(79,70,229,0.14)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#5B3DF5]"
                aria-hidden="true"
              >
                <ReceiptText className="h-[18px] w-[18px]" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Total gastado
              </span>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-[#5B3DF5] tabular-nums whitespace-nowrap shrink-0">
              {formatPercentage(spentPercentage)} usado
            </span>
          </div>

          <p className="mt-3.5 font-display text-[1.75rem] font-extrabold tracking-tight text-[#0f172a] tabular-nums sm:text-[2rem]">
            {formatShortCOP(totalSpent)}{' '}
            <span className="text-base font-bold sm:text-lg">COP</span>
          </p>

          <p className="mt-2 text-xs leading-relaxed text-slate-500 tabular-nums sm:text-[13px]">
            {totalSpent > 0
              ? `Promedio diario: ${formatShortCOP(dailyAverageSpent)} COP (${currentDay} días)`
              : 'Sin gastos registrados este mes'}
          </p>
        </div>
      </div>

      {/* Enclosed Visual Progress Indicator + Account Status (Balance positivo / Balance negativo) */}
      <div
        className={`mt-4 rounded-2xl border p-4 transition-colors sm:px-5 sm:py-4 ${
          isPositiveBalance
            ? 'border-slate-100 bg-slate-50/75'
            : 'border-rose-200 bg-rose-50/70'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isPositiveBalance ? 'bg-[#1e1b4b]' : 'bg-rose-600'
              }`}
              aria-hidden="true"
            />
            <span className="font-semibold text-[#0f172a]">
              Gastado: {formatPercentage(spentPercentage)}
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-slate-600 tabular-nums">
              {formatShortCOP(totalSpent)} COP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isPositiveBalance ? 'bg-emerald-500' : 'bg-rose-600'
              }`}
              aria-hidden="true"
            />
            <span
              className={`font-semibold ${
                isPositiveBalance ? 'text-emerald-600' : 'text-rose-700'
              }`}
            >
              Disponible: {formatPercentage(availablePercentage)}
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span
              className={`font-medium tabular-nums ${
                isPositiveBalance ? 'text-emerald-600' : 'text-rose-700'
              }`}
            >
              {formatShortCOP(availableBalance)} COP
            </span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Porcentaje del presupuesto gastado frente al saldo disponible"
          aria-valuenow={Math.min(100, Math.round(spentPercentage))}
          aria-valuemin={0}
          aria-valuemax={100}
          className="my-3 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200/70"
        >
          <div
            style={{ width: `${clampedSpentWidth}%` }}
            className={`h-full transition-all duration-300 ${
              isPositiveBalance
                ? 'bg-gradient-to-r from-[#1e1b4b] to-[#5B3DF5]'
                : 'bg-gradient-to-r from-rose-600 to-rose-500'
            }`}
          />
          <div
            style={{ width: `${clampedAvailableWidth}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-[13px]">
            {isPositiveBalance ? (
              <>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${
                    isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  aria-hidden="true"
                >
                  {isWarning ? (
                    <AlertTriangle className="h-2.5 w-2.5 stroke-[2.5]" />
                  ) : (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  )}
                </span>
                <span className="font-bold text-emerald-700">
                  Balance positivo
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-600">
                  {totalSpent === 0
                    ? `Tu presupuesto está completo al 100,0% para los ${totalDays} días del mes.`
                    : isWarning
                      ? `Has utilizado el ${formatPercentage(spentPercentage)} del presupuesto al día ${currentDay} de ${totalDays}.`
                      : `Conservas el ${formatPercentage(availablePercentage)} disponible para los últimos ${remainingDays} días del mes.`}
                </span>
              </>
            ) : (
              <>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white"
                  aria-hidden="true"
                >
                  <AlertTriangle className="h-2.5 w-2.5 stroke-[2.5]" />
                </span>
                <span className="font-bold text-rose-700">
                  Balance negativo
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-medium text-rose-700">
                  Superaste tu presupuesto disponible en {formatShortCOP(Math.abs(availableBalance))} COP.
                </span>
              </>
            )}
          </div>

          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            Día {currentDay} de {totalDays} ({formatPercentage((currentDay / totalDays) * 100)} del mes)
          </span>
        </div>
      </div>
    </section>
  );
}
