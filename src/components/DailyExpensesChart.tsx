import { useMemo, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  CATEGORY_LIST,
  CATEGORY_META,
  formatAxisCOP,
  formatCOP,
} from '../data/budgetData';
import { DailyExpensePoint, ExpenseCategory } from '../types/budget';

interface DailyExpensesChartProps {
  dailySeries: DailyExpensePoint[];
  monthlyBudget: number;
  currentDay: number;
  selectedCategory: ExpenseCategory | 'all';
  onSelectCategory: (category: ExpenseCategory | 'all') => void;
}

type ChartMode = 'daily' | 'cumulative';

export function DailyExpensesChart({
  dailySeries,
  monthlyBudget,
  currentDay,
  selectedCategory,
  onSelectCategory,
}: DailyExpensesChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('daily');
  const [activeDay, setActiveDay] = useState<number>(currentDay);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return dailySeries.map((point) => {
      const filteredAmount =
        selectedCategory === 'all'
          ? point.amount
          : point.byCategory[selectedCategory];

      if (!point.isFuture) {
        cumulative += filteredAmount;
      }

      return {
        ...point,
        displayAmount: filteredAmount,
        displayCumulative: cumulative,
      };
    });
  }, [dailySeries, selectedCategory]);

  const activeDaysOnly = useMemo(
    () => chartData.filter((d) => !d.isFuture),
    [chartData],
  );

  const totalFilteredSpent = useMemo(
    () => activeDaysOnly.reduce((sum, d) => sum + d.displayAmount, 0),
    [activeDaysOnly],
  );

  const dailyAverageFiltered =
    activeDaysOnly.length > 0 ? totalFilteredSpent / activeDaysOnly.length : 0;

  const yMax = useMemo(() => {
    if (chartMode === 'cumulative') {
      if (selectedCategory === 'all') {
        return Math.max(monthlyBudget * 1.08, totalFilteredSpent * 1.1, 1000000);
      }
      const maxCum = Math.max(
        ...activeDaysOnly.map((d) => d.displayCumulative),
        100000,
      );
      return Math.ceil((maxCum * 1.2) / 100000) * 100000;
    }
    const maxDaily = Math.max(
      ...activeDaysOnly.map((d) => d.displayAmount),
      50000,
    );
    const minCeiling = selectedCategory === 'all' ? 200000 : 100000;
    return Math.max(minCeiling, Math.ceil(maxDaily / 50000) * 50000);
  }, [
    activeDaysOnly,
    chartMode,
    monthlyBudget,
    selectedCategory,
    totalFilteredSpent,
  ]);

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => (yMax / steps) * i);
  }, [yMax]);

  const selectedPoint = useMemo(
    () =>
      chartData.find((d) => d.day === activeDay) ?? chartData[currentDay - 1],
    [activeDay, chartData, currentDay],
  );

  const hoveredPoint = useMemo(
    () =>
      hoveredDay !== null
        ? chartData.find((d) => d.day === hoveredDay && !d.isFuture) ?? null
        : null,
    [chartData, hoveredDay],
  );

  const accentColor =
    selectedCategory === 'all'
      ? '#4f46e5'
      : CATEGORY_META[selectedCategory].barColor;

  // SVG dimensions with space for visible X-axis line, day numbers, and X-axis title
  const svgWidth = 720;
  const svgHeight = 272;
  const padLeft = 58;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 46;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const slotWidth = plotWidth / chartData.length;
  const barWidth = Math.max(9, Math.min(13.5, slotWidth * 0.62));

  const getY = (value: number) =>
    padTop + plotHeight - (Math.min(value, yMax) / yMax) * plotHeight;

  const getXCenter = (index: number) =>
    padLeft + index * slotWidth + slotWidth / 2;

  const cumulativeLinePath = useMemo(() => {
    if (activeDaysOnly.length === 0) return '';
    return activeDaysOnly
      .map((point, index) => {
        const x = getXCenter(index);
        const y = getY(point.displayCumulative);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeDaysOnly, yMax]);

  const cumulativeAreaPath = useMemo(() => {
    if (activeDaysOnly.length === 0) return '';
    const firstX = getXCenter(0);
    const lastX = getXCenter(activeDaysOnly.length - 1);
    const baseY = padTop + plotHeight;
    return `${cumulativeLinePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  }, [activeDaysOnly.length, cumulativeLinePath, plotHeight]);

  // Compute floating tooltip position in percentages relative to SVG box
  const tooltipPosition = useMemo(() => {
    if (!hoveredPoint) return null;
    const index = hoveredPoint.day - 1;
    const xPx = getXCenter(index);
    const yValue =
      chartMode === 'daily'
        ? hoveredPoint.displayAmount
        : hoveredPoint.displayCumulative;
    const yPx = getY(yValue);

    const rawLeftPct = (xPx / svgWidth) * 100;
    const clampedLeftPct = Math.min(84, Math.max(16, rawLeftPct));
    const topPct = Math.max(4, ((yPx - 14) / svgHeight) * 100);

    return {
      leftPct: clampedLeftPct,
      topPct,
      amount: yValue,
      point: hoveredPoint,
    };
  }, [chartMode, hoveredPoint, yMax]);

  return (
    <section
      aria-labelledby="grafico-gastos-titulo"
      className="flex h-full flex-col justify-between rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-6"
    >
      <div>
        {/* Header & Mode Segmented Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#5B3DF5]"
                aria-hidden="true"
              >
                <BarChart2 className="h-[18px] w-[18px]" />
              </div>
              <h2
                id="grafico-gastos-titulo"
                className="text-lg font-bold tracking-tight text-[#0f172a]"
              >
                Comportamiento de gastos diarios
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 sm:text-[13px]">
              {chartMode === 'daily'
                ? `Distribución diaria del 1 al ${currentDay} de noviembre de 2026`
                : 'Evolución acumulada frente al presupuesto mensual'}
            </p>
          </div>

          <div
            role="group"
            aria-label="Tipo de gráfico"
            className="inline-flex self-start rounded-full bg-slate-100 p-1 sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setChartMode('daily')}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                chartMode === 'daily'
                  ? 'bg-[#5B3DF5] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por día
            </button>
            <button
              type="button"
              onClick={() => setChartMode('cumulative')}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                chartMode === 'cumulative'
                  ? 'bg-[#5B3DF5] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acumulado
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          role="group"
          aria-label="Filtrar gráfico por categoría"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              selectedCategory === 'all'
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'border border-slate-200/80 bg-white text-slate-600 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            Todas ({formatCOP(chartData[currentDay - 1]?.cumulativeAmount ?? 0)})
          </button>

          {CATEGORY_LIST.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isSelected
                    ? 'bg-[#0f172a] text-white shadow-sm'
                    : 'border border-slate-200/80 bg-white text-slate-700 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:text-slate-900'
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

        {/* SVG Chart with Floating Hover Tooltip */}
        <div
          className="relative mt-5 w-full"
          onMouseLeave={() => setHoveredDay(null)}
        >
          {/* Floating Tooltip on Hover */}
          {tooltipPosition && (
            <div
              role="tooltip"
              style={{
                left: `${tooltipPosition.leftPct}%`,
                top: `${tooltipPosition.topPct}%`,
              }}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200/80 bg-[#0f172a] px-3 py-2 text-white shadow-lg"
            >
              <p className="text-[11px] font-medium text-slate-300 whitespace-nowrap">
                {tooltipPosition.point.dateLabel}
              </p>
              <p className="mt-0.5 font-display text-xs font-bold text-white tabular-nums whitespace-nowrap sm:text-[13px]">
                {formatCOP(tooltipPosition.amount)}
              </p>
              {chartMode === 'cumulative' && (
                <p className="mt-0.5 text-[10px] text-emerald-300 tabular-nums whitespace-nowrap">
                  Día: {formatCOP(tooltipPosition.point.displayAmount)}
                </p>
              )}
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-auto w-full select-none"
            role="img"
            aria-label="Gráfico de gastos diarios del mes de noviembre de 2026"
          >
            {/* Horizontal gridlines & Y-axis labels */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              const isBaseline = tick === 0;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={isBaseline ? '#cbd5e1' : '#eef2f6'}
                    strokeWidth={isBaseline ? 1.25 : 1}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px] font-medium tabular-nums"
                  >
                    {formatAxisCOP(tick)}
                  </text>
                </g>
              );
            })}

            {/* Average Daily Reference Line */}
            {chartMode === 'daily' && dailyAverageFiltered > 0 && (
              <g>
                <line
                  x1={padLeft}
                  y1={getY(dailyAverageFiltered)}
                  x2={svgWidth - padRight}
                  y2={getY(dailyAverageFiltered)}
                  stroke="#10b981"
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                />
                <text
                  x={svgWidth - padRight}
                  y={getY(dailyAverageFiltered) - 6}
                  textAnchor="end"
                  className="fill-emerald-600 text-[11px] font-semibold tabular-nums"
                >
                  Promedio: {formatCOP(dailyAverageFiltered)}
                </text>
              </g>
            )}

            {/* Cumulative Monthly Budget Line */}
            {chartMode === 'cumulative' && selectedCategory === 'all' && (
              <g>
                <line
                  x1={padLeft}
                  y1={getY(monthlyBudget)}
                  x2={svgWidth - padRight}
                  y2={getY(monthlyBudget)}
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <text
                  x={padLeft + 6}
                  y={getY(monthlyBudget) - 7}
                  textAnchor="start"
                  className="fill-emerald-600 text-[11px] font-semibold tabular-nums"
                >
                  Presupuesto mensual: {formatCOP(monthlyBudget)}
                </text>
              </g>
            )}

            {/* Daily Bars */}
            {chartMode === 'daily' &&
              chartData.map((point, index) => {
                const xCenter = getXCenter(index);
                const xBar = xCenter - barWidth / 2;
                const yBar = getY(point.displayAmount);
                const barHeight = Math.max(0, padTop + plotHeight - yBar);
                const isSelected = point.day === (hoveredDay ?? selectedPoint?.day);

                if (point.isFuture) {
                  return null;
                }

                return (
                  <g
                    key={point.day}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredDay(point.day);
                      setActiveDay(point.day);
                    }}
                    onClick={() => setActiveDay(point.day)}
                  >
                    <rect
                      x={padLeft + index * slotWidth}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight}
                      fill="transparent"
                    />
                    {isSelected && (
                      <rect
                        x={padLeft + index * slotWidth + 1}
                        y={padTop}
                        width={slotWidth - 2}
                        height={plotHeight}
                        rx={4}
                        fill="#f1f5f9"
                      />
                    )}
                    <rect
                      x={xBar}
                      y={point.displayAmount > 0 ? yBar : padTop + plotHeight - 2}
                      width={barWidth}
                      height={point.displayAmount > 0 ? Math.max(4, barHeight) : 2}
                      rx={3.5}
                      fill={
                        point.displayAmount === 0
                          ? '#cbd5e1'
                          : isSelected
                            ? selectedCategory === 'all'
                              ? '#0f172a'
                              : accentColor
                            : selectedCategory === 'all'
                              ? '#4e5277'
                              : accentColor
                      }
                      fillOpacity={
                        point.displayAmount === 0 ? 0.55 : isSelected ? 1 : 0.9
                      }
                    />
                  </g>
                );
              })}

            {/* Cumulative Area & Line */}
            {chartMode === 'cumulative' && (
              <g>
                <defs>
                  <linearGradient
                    id="cumulativeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
                    <stop
                      offset="100%"
                      stopColor={accentColor}
                      stopOpacity="0.01"
                    />
                  </linearGradient>
                </defs>

                {cumulativeAreaPath && (
                  <path d={cumulativeAreaPath} fill="url(#cumulativeGradient)" />
                )}

                {cumulativeLinePath && (
                  <path
                    d={cumulativeLinePath}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {activeDaysOnly.map((point, index) => {
                  const x = getXCenter(index);
                  const y = getY(point.displayCumulative);
                  const isSelected = point.day === (hoveredDay ?? selectedPoint?.day);

                  return (
                    <g
                      key={point.day}
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        setHoveredDay(point.day);
                        setActiveDay(point.day);
                      }}
                      onClick={() => setActiveDay(point.day)}
                    >
                      <rect
                        x={padLeft + index * slotWidth}
                        y={padTop}
                        width={slotWidth}
                        height={plotHeight}
                        fill="transparent"
                      />
                      {isSelected && (
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={padTop + plotHeight}
                          stroke="#cbd5e1"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 5.5 : 3.25}
                        fill={isSelected ? accentColor : '#ffffff'}
                        stroke={accentColor}
                        strokeWidth={isSelected ? 2.5 : 2}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* X-axis day ticks & visible tick marks */}
            {chartData.map((point, index) => {
              const showLabel =
                point.day === 1 ||
                point.day === 3 ||
                point.day === 5 ||
                point.day === 7 ||
                point.day === 9 ||
                point.day === 11 ||
                point.day === 13 ||
                point.day === 15 ||
                point.day === currentDay ||
                point.day === 20 ||
                point.day === 25 ||
                point.day === 30;

              if (!showLabel) return null;

              const xCenter = getXCenter(index);
              const isCurrentDay = point.day === currentDay;
              return (
                <g key={`tick-${point.day}`}>
                  <line
                    x1={xCenter}
                    y1={padTop + plotHeight}
                    x2={xCenter}
                    y2={padTop + plotHeight + 4}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                  />
                  <text
                    x={xCenter}
                    y={padTop + plotHeight + 17}
                    textAnchor="middle"
                    className={`text-[11px] tabular-nums ${
                      isCurrentDay
                        ? 'fill-[#0f172a] font-bold'
                        : 'fill-slate-500 font-medium'
                    }`}
                  >
                    {point.day}
                  </text>
                </g>
              );
            })}

            {/* Visible X-axis title */}
            <text
              x={padLeft + plotWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-semibold"
            >
              Día del mes (Noviembre 2026)
            </text>
          </svg>
        </div>
      </div>

      {/* Compact Selected Day Inspection Footer */}
      {selectedPoint && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-semibold text-[#0f172a]">
              {selectedPoint.dateLabel}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            {selectedPoint.displayAmount > 0 ? (
              <span className="text-slate-500">
                {(selectedCategory === 'all'
                  ? selectedPoint.items
                  : selectedPoint.items.filter(
                      (item) => item.category === selectedCategory,
                    )
                )
                  .map((item) => item.concept)
                  .join(' + ')}
              </span>
            ) : (
              <span className="text-slate-400">
                {selectedPoint.isFuture
                  ? 'Día aún no transcurrido'
                  : 'Sin gastos registrados en esta categoría'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="text-slate-500">
              {chartMode === 'daily' ? 'Total del día:' : 'Acumulado:'}
            </span>
            <span className="font-display font-bold text-[#0f172a] tabular-nums">
              {formatCOP(
                chartMode === 'daily'
                  ? selectedPoint.displayAmount
                  : selectedPoint.displayCumulative,
              )}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
