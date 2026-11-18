import { ArrowLeft, Pencil } from 'lucide-react';
import {
  CATEGORY_META,
  formatCOP,
  formatFullDateLabel,
  formatPercentage,
  formatShortCOP,
} from '../data/budgetData';
import { BudgetMovement } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

interface MovementDetailViewProps {
  movement: BudgetMovement | null;
  monthlyBudget: number;
  totalSpent: number;
  onBack: () => void;
}

export function MovementDetailView({
  movement,
  monthlyBudget,
  totalSpent,
  onBack,
}: MovementDetailViewProps) {
  // Empty Detalle state: soft text only, explicitly no button
  if (!movement) {
    return (
      <section
        aria-label="Detalle de movimiento"
        className="mx-auto max-w-2xl rounded-[24px] border border-white/90 bg-white/95 px-6 py-16 text-center shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:px-10 sm:py-20"
      >
        <p className="text-sm font-medium text-slate-500 sm:text-base">
          Selecciona un gasto en Movimientos para ver el detalle
        </p>
      </section>
    );
  }

  const isIncome = movement.type === 'income';
  const categoryLabel = isIncome
    ? movement.incomeCategory
    : CATEGORY_META[movement.category].label;
  const budgetImpact =
    monthlyBudget > 0 ? (movement.amount / monthlyBudget) * 100 : 0;
  const spentShare =
    !isIncome && totalSpent > 0 ? (movement.amount / totalSpent) * 100 : 0;

  return (
    <section
      aria-labelledby="detalle-gasto-titulo"
      className="mx-auto max-w-2xl rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-8"
    >
      {/* Top Action Bar: Volver & Editar (sin funcionalidad) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Volver</span>
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Edición no disponible en esta versión"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-400 whitespace-nowrap shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Editar</span>
        </button>
      </div>

      {/* Hero Summary */}
      <div className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CategoryIcon
            isIncome={isIncome}
            category={isIncome ? undefined : movement.category}
            size="md"
          />
          <div>
            <p
              className={`text-xs font-semibold ${
                isIncome ? 'text-emerald-600' : 'text-[#5B3DF5]'
              }`}
            >
              {isIncome ? `Ingreso · ${categoryLabel}` : categoryLabel}
            </p>
            <h2
              id="detalle-gasto-titulo"
              className="mt-0.5 text-xl font-bold tracking-tight text-[#0f172a]"
            >
              {movement.concept}
            </h2>
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-medium text-slate-500">
            {isIncome ? 'Ingreso registrado' : 'Monto registrado'}
          </p>
          <p
            className={`mt-0.5 font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl ${
              isIncome ? 'text-emerald-600' : 'text-[#0f172a]'
            }`}
          >
            {isIncome
              ? `+${formatShortCOP(movement.amount)} COP`
              : formatCOP(movement.amount)}
          </p>
        </div>
      </div>

      {/* Complete Metadata Rows */}
      <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 sm:px-5">
        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            Tipo de movimiento
          </dt>
          <dd
            className={`text-sm font-semibold ${
              isIncome ? 'text-emerald-700' : 'text-[#0f172a]'
            }`}
          >
            {isIncome ? 'Ingreso al presupuesto' : 'Gasto registrado'}
          </dd>
        </div>

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            {isIncome ? 'Descripción' : 'Concepto'}
          </dt>
          <dd className="text-sm font-semibold text-[#0f172a]">
            {movement.concept}
          </dd>
        </div>

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            Categoría
          </dt>
          <dd className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: isIncome
                  ? '#10b981'
                  : CATEGORY_META[movement.category].barColor,
              }}
              aria-hidden="true"
            />
            <span>{categoryLabel}</span>
          </dd>
        </div>

        {isIncome && (
          <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
            <dt className="text-xs font-medium text-slate-500 sm:text-sm">
              Medio de pago
            </dt>
            <dd className="text-sm font-semibold text-[#0f172a]">
              {movement.paymentMethod}
            </dd>
          </div>
        )}

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            {isIncome ? 'Fecha del ingreso' : 'Fecha del gasto'}
          </dt>
          <dd className="text-sm font-semibold text-[#0f172a] tabular-nums">
            {isIncome ? movement.fullDateText : formatFullDateLabel(movement.day)}
          </dd>
        </div>

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            Hora de registro
          </dt>
          <dd className="text-sm font-semibold text-[#0f172a] tabular-nums">
            {movement.timeLabel}
          </dd>
        </div>

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            {isIncome
              ? 'Aporte al presupuesto mensual'
              : 'Impacto en el presupuesto mensual'}
          </dt>
          <dd className="text-sm font-semibold text-[#0f172a] tabular-nums">
            {formatPercentage(budgetImpact)} de {formatCOP(monthlyBudget)}
          </dd>
        </div>

        {!isIncome && (
          <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
            <dt className="text-xs font-medium text-slate-500 sm:text-sm">
              Peso sobre el total gastado
            </dt>
            <dd className="text-sm font-semibold text-[#0f172a] tabular-nums">
              {formatPercentage(spentShare)} del gasto acumulado
            </dd>
          </div>
        )}

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            Observaciones
          </dt>
          <dd className="text-sm text-slate-700">
            {movement.note?.trim() ? movement.note : 'Sin observaciones'}
          </dd>
        </div>

        <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">
            Código de registro
          </dt>
          <dd className="font-mono text-xs font-medium text-slate-500">
            {movement.id.toUpperCase()}
          </dd>
        </div>
      </dl>
    </section>
  );
}
