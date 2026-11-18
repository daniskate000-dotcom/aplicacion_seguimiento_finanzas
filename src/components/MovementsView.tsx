import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, ListOrdered, Plus, Search } from 'lucide-react';
import {
  CATEGORY_LIST,
  CATEGORY_META,
  CURRENT_DAY_OF_MONTH,
  formatCOP,
  formatFullDateLabel,
  formatShortCOP,
} from '../data/budgetData';
import { BudgetMovement, ExpenseCategory } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

interface MovementsViewProps {
  movements: BudgetMovement[];
  monthName: string;
  onSelectMovement: (id: string) => void;
  onBackToDashboard: () => void;
  onRegisterExpense: () => void;
}

type FilterOption = 'all' | 'income' | ExpenseCategory;

export function MovementsView({
  movements,
  monthName,
  onSelectMovement,
  onBackToDashboard,
  onRegisterExpense,
}: MovementsViewProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movements.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'income'
          ? item.type === 'income'
          : item.type === 'expense' && item.category === filter);

      const categoryLabel =
        item.type === 'income'
          ? `ingreso ${item.incomeCategory} ${item.paymentMethod}`
          : CATEGORY_META[item.category].label;

      const matchesQuery =
        q.length === 0 ||
        item.concept.toLowerCase().includes(q) ||
        categoryLabel.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, movements, searchQuery]);

  const groupedByDay = useMemo(() => {
    const groups: {
      day: number;
      fullDate: string;
      items: BudgetMovement[];
    }[] = [];

    for (const item of filteredMovements) {
      const existing = groups.find((g) => g.day === item.day);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          day: item.day,
          fullDate:
            item.type === 'income'
              ? item.fullDateText
              : formatFullDateLabel(item.day),
          items: [item],
        });
      }
    }
    return groups;
  }, [filteredMovements]);

  // Empty state when no movements are registered yet
  if (movements.length === 0) {
    return (
      <section
        aria-labelledby="movimientos-vacio-titulo"
        className="rounded-[24px] border border-white/90 bg-white/95 p-6 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-10"
      >
        <button
          type="button"
          onClick={onBackToDashboard}
          className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5B3DF5] hover:text-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Volver al Dashboard</span>
        </button>

        <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-[#5B3DF5]"
            aria-hidden="true"
          >
            <ListOrdered className="h-6 w-6" />
          </div>
          <h2
            id="movimientos-vacio-titulo"
            className="mt-5 text-xl font-bold tracking-tight text-[#0f172a] sm:text-2xl"
          >
            Tus gastos van a vivir aquí
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Cada vez que pagues algo, lo registras y aparece en esta lista
          </p>
          <button
            type="button"
            onClick={onRegisterExpense}
            className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Registrar gasto</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="movimientos-mes-titulo"
      className="rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-7"
    >
      {/* Top Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5B3DF5] hover:text-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Volver al Dashboard</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#5B3DF5]"
              aria-hidden="true"
            >
              <ListOrdered className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2
                id="movimientos-mes-titulo"
                className="text-lg font-bold tracking-tight text-[#0f172a] sm:text-xl"
              >
                Movimientos de {monthName.toLowerCase()}
              </h2>
              <p className="text-xs text-slate-500 tabular-nums sm:text-[13px]">
                {filteredMovements.length}{' '}
                {filteredMovements.length === 1
                  ? 'movimiento registrado'
                  : 'movimientos registrados'}
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar movimiento..."
            aria-label="Buscar movimiento por descripción o categoría"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="Filtrar movimientos por tipo o categoría"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
            filter === 'all'
              ? 'bg-[#0f172a] text-white shadow-sm'
              : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Todos ({movements.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'income' ? 'all' : 'income')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
            filter === 'income'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <span aria-hidden="true">💰</span>
          <span>Ingresos</span>
        </button>

        {CATEGORY_LIST.map((cat) => {
          const isSelected = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(isSelected ? 'all' : cat.id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                isSelected
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: isSelected ? '#ffffff' : cat.barColor,
                }}
                aria-hidden="true"
              />
              <span>{cat.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Chronological Grouped List */}
      {groupedByDay.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No se encontraron movimientos con los filtros aplicados
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Prueba otra palabra clave o limpia los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 cursor-pointer rounded-full bg-[#5B3DF5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            Mostrar todos los movimientos
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groupedByDay.map((group) => (
            <div key={group.day}>
              <div className="mb-2 border-b border-slate-100 pb-2">
                <h3 className="text-[13px] font-semibold text-slate-700">
                  {group.fullDate}
                </h3>
              </div>

              <ul className="divide-y divide-slate-100">
                {group.items.map((item) => {
                  const isIncome = item.type === 'income';
                  const dateText =
                    isIncome && item.day === CURRENT_DAY_OF_MONTH
                      ? 'Hoy'
                      : item.dateLabel;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMovement(item.id)}
                        className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <CategoryIcon
                            isIncome={isIncome}
                            category={isIncome ? undefined : item.category}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0f172a] group-hover:text-[#5B3DF5]">
                              {item.concept}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {isIncome ? (
                                <>
                                  <span className="tabular-nums">
                                    {dateText}
                                  </span>{' '}
                                  <span aria-hidden="true">•</span>{' '}
                                  <span className="font-medium text-emerald-700">
                                    Ingreso
                                  </span>{' '}
                                  <span aria-hidden="true">·</span>{' '}
                                  <span>{item.incomeCategory}</span>
                                </>
                              ) : (
                                <>
                                  {CATEGORY_META[item.category].label}{' '}
                                  <span aria-hidden="true">·</span>{' '}
                                  <span className="tabular-nums">
                                    {item.timeLabel}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-right">
                          <span
                            className={`font-display text-sm font-bold tabular-nums sm:text-[15px] ${
                              isIncome ? 'text-emerald-600' : 'text-[#0f172a]'
                            }`}
                          >
                            {isIncome
                              ? `+${formatShortCOP(item.amount)} COP`
                              : formatCOP(item.amount)}
                          </span>
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
