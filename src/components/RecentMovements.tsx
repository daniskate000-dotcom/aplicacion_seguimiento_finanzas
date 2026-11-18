import { ChevronRight, History } from 'lucide-react';
import {
  CATEGORY_META,
  CURRENT_DAY_OF_MONTH,
  formatCOP,
  formatShortCOP,
} from '../data/budgetData';
import { BudgetMovement } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

interface RecentMovementsProps {
  movements: BudgetMovement[];
  onViewAll: () => void;
  onSelectMovement: (id: string) => void;
}

export function RecentMovements({
  movements,
  onViewAll,
  onSelectMovement,
}: RecentMovementsProps) {
  return (
    <section
      aria-labelledby="ultimos-movimientos-titulo"
      className="flex h-full flex-col rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#5B3DF5]"
            aria-hidden="true"
          >
            <History className="h-[18px] w-[18px]" />
          </div>
          <h2
            id="ultimos-movimientos-titulo"
            className="text-lg font-bold tracking-tight text-[#0f172a]"
          >
            Últimos movimientos
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex cursor-pointer items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#5B3DF5] whitespace-nowrap shrink-0 transition-colors hover:bg-indigo-50 hover:text-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
        >
          <span>Ver todo</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <ul className="flex flex-1 flex-col justify-between divide-y divide-slate-100 border-t border-slate-100">
        {movements.map((movement) => {
          const isIncome = movement.type === 'income';
          const dateText =
            isIncome && movement.day === CURRENT_DAY_OF_MONTH
              ? 'Hoy'
              : movement.dateLabel;

          return (
            <li key={movement.id}>
              <button
                type="button"
                onClick={() => onSelectMovement(movement.id)}
                className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-1.5 py-3.5 text-left transition-colors hover:bg-slate-50/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <CategoryIcon
                    isIncome={isIncome}
                    category={isIncome ? undefined : movement.category}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0f172a] group-hover:text-[#5B3DF5]">
                      {movement.concept}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      {isIncome ? (
                        <>
                          <span className="tabular-nums">{dateText}</span>{' '}
                          <span aria-hidden="true">•</span>{' '}
                          <span className="font-medium text-emerald-700">
                            Ingreso
                          </span>
                        </>
                      ) : (
                        <>
                          {CATEGORY_META[movement.category].label}{' '}
                          <span aria-hidden="true">·</span>{' '}
                          <span className="tabular-nums">{movement.dateLabel}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 text-right">
                  <p
                    className={`font-display text-sm font-bold tabular-nums sm:text-[15px] ${
                      isIncome ? 'text-emerald-600' : 'text-[#0f172a]'
                    }`}
                  >
                    {isIncome
                      ? `+${formatShortCOP(movement.amount)} COP`
                      : formatCOP(movement.amount)}
                  </p>
                  <ChevronRight
                    className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#5B3DF5]"
                    aria-hidden="true"
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
