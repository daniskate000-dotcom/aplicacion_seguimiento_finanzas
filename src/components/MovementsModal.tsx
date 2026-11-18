import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ListOrdered, Search, X } from 'lucide-react';
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

interface MovementsModalProps {
  isOpen: boolean;
  movements: BudgetMovement[];
  monthName: string;
  onClose: () => void;
  onSelectMovement: (id: string) => void;
}

type HistoryFilter = 'all' | 'income' | ExpenseCategory;

export function MovementsModal({
  isOpen,
  movements,
  monthName,
  onClose,
  onSelectMovement,
}: MovementsModalProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const netFilteredTotal = useMemo(
    () =>
      filteredMovements.reduce(
        (sum, item) =>
          item.type === 'income' ? sum + item.amount : sum - item.amount,
        0,
      ),
    [filteredMovements],
  );

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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-historial-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-b border-slate-100 px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#5B3DF5]"
                aria-hidden="true"
              >
                <ListOrdered className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="modal-historial-titulo"
                  className="text-lg font-bold tracking-tight text-[#0f172a] sm:text-xl"
                >
                  Historial de movimientos · {monthName}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums sm:text-[13px]">
                  {filteredMovements.length}{' '}
                  {filteredMovements.length === 1
                    ? 'movimiento registrado'
                    : 'movimientos registrados'}{' '}
                  · Balance filtrado:{' '}
                  <span className="font-semibold text-slate-700">
                    {formatCOP(netFilteredTotal)}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar historial"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Search & Filter Row */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingreso o gasto..."
                aria-label="Buscar movimiento en el historial"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                  filter === 'all'
                    ? 'bg-[#0f172a] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilter(filter === 'income' ? 'all' : 'income')
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                  filter === 'income'
                    ? 'bg-emerald-600 text-white'
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
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                      isSelected
                        ? 'bg-[#0f172a] text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900'
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
          </div>
        </div>

        {/* Scrollable Chronological Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {groupedByDay.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No se encontraron movimientos con este filtro
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3 cursor-pointer rounded-full bg-[#5B3DF5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4b2ee3]"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedByDay.map((group) => (
                <div key={group.day}>
                  <div className="mb-1.5 border-b border-slate-100 pb-1.5">
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
                            className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <CategoryIcon
                                isIncome={isIncome}
                                category={isIncome ? undefined : item.category}
                                size="sm"
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
                                className={`font-display text-sm font-bold tabular-nums ${
                                  isIncome
                                    ? 'text-emerald-600'
                                    : 'text-[#0f172a]'
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
        </div>
      </div>
    </div>
  );
}
