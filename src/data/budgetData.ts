import {
  BudgetMovement,
  CategoryBreakdown,
  CategoryMeta,
  DailyExpensePoint,
  ExpenseCategory,
  ExpenseRecord,
  IncomeCategory,
  PaymentMethod,
} from '../types/budget';

export const MONTH_NAME = 'Noviembre 2026';
export const TOTAL_DAYS_IN_MONTH = 30;
export const CURRENT_DAY_OF_MONTH = 17;
export const MONTHLY_BUDGET_COP = 3200000;

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta',
  'Otro',
];

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  [ExpenseCategory.Alimentacion]: {
    id: ExpenseCategory.Alimentacion,
    label: 'Alimentación',
    shortLabel: 'Alimentación',
    barColor: '#059669',
    dotColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-700',
  },
  [ExpenseCategory.Transporte]: {
    id: ExpenseCategory.Transporte,
    label: 'Transporte',
    shortLabel: 'Transporte',
    barColor: '#0284C7',
    dotColor: 'bg-sky-600',
    iconBg: 'bg-sky-50',
    iconText: 'text-sky-700',
  },
  [ExpenseCategory.Servicios]: {
    id: ExpenseCategory.Servicios,
    label: 'Servicios públicos',
    shortLabel: 'Servicios',
    barColor: '#D97706',
    dotColor: 'bg-amber-600',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-700',
  },
  [ExpenseCategory.Ropa]: {
    id: ExpenseCategory.Ropa,
    label: 'Ropa y compras personales',
    shortLabel: 'Ropa y compras',
    barColor: '#5B3DF5',
    dotColor: 'bg-[#5B3DF5]',
    iconBg: 'bg-indigo-50',
    iconText: 'text-[#5B3DF5]',
  },
  [ExpenseCategory.Entretenimiento]: {
    id: ExpenseCategory.Entretenimiento,
    label: 'Entretenimiento y ocio',
    shortLabel: 'Ocio',
    barColor: '#E11D48',
    dotColor: 'bg-rose-600',
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-700',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORY_META[ExpenseCategory.Alimentacion],
  CATEGORY_META[ExpenseCategory.Transporte],
  CATEGORY_META[ExpenseCategory.Servicios],
  CATEGORY_META[ExpenseCategory.Ropa],
  CATEGORY_META[ExpenseCategory.Entretenimiento],
];

// Initial simulated expenses in Colombia for November 1–17, 2026.
export const INITIAL_MONTHLY_MOVEMENTS: BudgetMovement[] = [
  {
    id: 'exp-01',
    type: 'expense',
    day: 1,
    dateLabel: '1 nov 2026',
    timeLabel: '1:15 p. m.',
    concept: 'Almuerzo familiar y mercado básico',
    category: ExpenseCategory.Alimentacion,
    amount: 145000,
  },
  {
    id: 'exp-02',
    type: 'expense',
    day: 1,
    dateLabel: '1 nov 2026',
    timeLabel: '4:40 p. m.',
    concept: 'Recarga de transporte masivo',
    category: ExpenseCategory.Transporte,
    amount: 25000,
  },
  {
    id: 'exp-03',
    type: 'expense',
    day: 2,
    dateLabel: '2 nov 2026',
    timeLabel: '8:20 a. m.',
    concept: 'Desayuno y café de la mañana',
    category: ExpenseCategory.Alimentacion,
    amount: 18500,
  },
  {
    id: 'exp-04',
    type: 'expense',
    day: 2,
    dateLabel: '2 nov 2026',
    timeLabel: '6:10 p. m.',
    concept: 'Pasajes urbanos del día',
    category: ExpenseCategory.Transporte,
    amount: 12000,
  },
  {
    id: 'exp-05',
    type: 'expense',
    day: 3,
    dateLabel: '3 nov 2026',
    timeLabel: '10:05 a. m.',
    concept: 'Servicio mensual de internet hogar',
    category: ExpenseCategory.Servicios,
    amount: 115000,
  },
  {
    id: 'exp-06',
    type: 'expense',
    day: 3,
    dateLabel: '3 nov 2026',
    timeLabel: '12:50 p. m.',
    concept: 'Almuerzo ejecutivo',
    category: ExpenseCategory.Alimentacion,
    amount: 24000,
  },
  {
    id: 'exp-07',
    type: 'expense',
    day: 4,
    dateLabel: '4 nov 2026',
    timeLabel: '5:30 p. m.',
    concept: 'Frutas, verduras y despensa semanal',
    category: ExpenseCategory.Alimentacion,
    amount: 68000,
  },
  {
    id: 'exp-08',
    type: 'expense',
    day: 4,
    dateLabel: '4 nov 2026',
    timeLabel: '9:15 p. m.',
    concept: 'Carrera en taxi nocturno',
    category: ExpenseCategory.Transporte,
    amount: 22000,
  },
  {
    id: 'exp-09',
    type: 'expense',
    day: 5,
    dateLabel: '5 nov 2026',
    timeLabel: '11:20 a. m.',
    concept: 'Factura de energía eléctrica',
    category: ExpenseCategory.Servicios,
    amount: 148000,
  },
  {
    id: 'exp-10',
    type: 'expense',
    day: 6,
    dateLabel: '6 nov 2026',
    timeLabel: '7:45 p. m.',
    concept: 'Entradas de cine y crispetas',
    category: ExpenseCategory.Entretenimiento,
    amount: 64000,
  },
  {
    id: 'exp-11',
    type: 'expense',
    day: 6,
    dateLabel: '6 nov 2026',
    timeLabel: '9:30 p. m.',
    concept: 'Cena rápida de viernes',
    category: ExpenseCategory.Alimentacion,
    amount: 42000,
  },
  {
    id: 'exp-12',
    type: 'expense',
    day: 7,
    dateLabel: '7 nov 2026',
    timeLabel: '3:10 p. m.',
    concept: 'Camisa básica y cuidado personal',
    category: ExpenseCategory.Ropa,
    amount: 135000,
  },
  {
    id: 'exp-13',
    type: 'expense',
    day: 7,
    dateLabel: '7 nov 2026',
    timeLabel: '6:25 p. m.',
    concept: 'Trayecto de movilidad urbana',
    category: ExpenseCategory.Transporte,
    amount: 28000,
  },
  {
    id: 'exp-14',
    type: 'expense',
    day: 8,
    dateLabel: '8 nov 2026',
    timeLabel: '10:45 a. m.',
    concept: 'Mercado semanal en plaza',
    category: ExpenseCategory.Alimentacion,
    amount: 118000,
  },
  {
    id: 'exp-15',
    type: 'expense',
    day: 9,
    dateLabel: '9 nov 2026',
    timeLabel: '8:35 a. m.',
    concept: 'Café y panadería',
    category: ExpenseCategory.Alimentacion,
    amount: 14500,
  },
  {
    id: 'exp-16',
    type: 'expense',
    day: 9,
    dateLabel: '9 nov 2026',
    timeLabel: '5:55 p. m.',
    concept: 'Pasajes de ida y regreso',
    category: ExpenseCategory.Transporte,
    amount: 12000,
  },
  {
    id: 'exp-17',
    type: 'expense',
    day: 10,
    dateLabel: '10 nov 2026',
    timeLabel: '9:50 a. m.',
    concept: 'Factura de acueducto y gas natural',
    category: ExpenseCategory.Servicios,
    amount: 96000,
  },
  {
    id: 'exp-18',
    type: 'expense',
    day: 11,
    dateLabel: '11 nov 2026',
    timeLabel: '1:10 p. m.',
    concept: 'Almuerzo y refrigerio',
    category: ExpenseCategory.Alimentacion,
    amount: 29500,
  },
  {
    id: 'exp-19',
    type: 'expense',
    day: 11,
    dateLabel: '11 nov 2026',
    timeLabel: '6:40 p. m.',
    concept: 'Transporte urbano',
    category: ExpenseCategory.Transporte,
    amount: 15500,
  },
  {
    id: 'exp-20',
    type: 'expense',
    day: 12,
    dateLabel: '12 nov 2026',
    timeLabel: '4:15 p. m.',
    concept: 'Artículos de aseo y farmacia',
    category: ExpenseCategory.Ropa,
    amount: 78000,
  },
  {
    id: 'exp-21',
    type: 'expense',
    day: 13,
    dateLabel: '13 nov 2026',
    timeLabel: '8:00 p. m.',
    concept: 'Salida con amigos y café',
    category: ExpenseCategory.Entretenimiento,
    amount: 89000,
  },
  {
    id: 'exp-22',
    type: 'expense',
    day: 13,
    dateLabel: '13 nov 2026',
    timeLabel: '10:35 p. m.',
    concept: 'Regreso a casa en taxi',
    category: ExpenseCategory.Transporte,
    amount: 24000,
  },
  {
    id: 'exp-23',
    type: 'expense',
    day: 14,
    dateLabel: '14 nov 2026',
    timeLabel: '11:30 a. m.',
    concept: 'Compra de proteínas y granos',
    category: ExpenseCategory.Alimentacion,
    amount: 152000,
  },
  {
    id: 'exp-24',
    type: 'expense',
    day: 14,
    dateLabel: '14 nov 2026',
    timeLabel: '4:50 p. m.',
    concept: 'Libro de lectura',
    category: ExpenseCategory.Entretenimiento,
    amount: 45000,
  },
  {
    id: 'exp-25',
    type: 'expense',
    day: 15,
    dateLabel: '15 nov 2026',
    timeLabel: '3:20 p. m.',
    concept: 'Entrada a parque recreativo y café',
    category: ExpenseCategory.Entretenimiento,
    amount: 54000,
  },
  {
    id: 'exp-26',
    type: 'expense',
    day: 15,
    dateLabel: '15 nov 2026',
    timeLabel: '1:40 p. m.',
    concept: 'Almuerzo dominical',
    category: ExpenseCategory.Alimentacion,
    amount: 48000,
  },
  {
    id: 'exp-27',
    type: 'expense',
    day: 16,
    dateLabel: '16 nov 2026',
    timeLabel: '4:05 p. m.',
    concept: 'Calzado casual en descuento',
    category: ExpenseCategory.Ropa,
    amount: 125000,
  },
  {
    id: 'exp-28',
    type: 'expense',
    day: 16,
    dateLabel: '16 nov 2026',
    timeLabel: '7:20 p. m.',
    concept: 'Recarga de transporte urbano',
    category: ExpenseCategory.Transporte,
    amount: 20000,
  },
  {
    id: 'exp-29',
    type: 'expense',
    day: 17,
    dateLabel: '17 nov 2026',
    timeLabel: '10:30 a. m.',
    concept: 'Plan de telefonía móvil',
    category: ExpenseCategory.Servicios,
    amount: 46000,
  },
  {
    id: 'exp-30',
    type: 'expense',
    day: 17,
    dateLabel: '17 nov 2026',
    timeLabel: '1:25 p. m.',
    concept: 'Mercado express y almuerzo',
    category: ExpenseCategory.Alimentacion,
    amount: 38500,
  },
];

export function formatCOP(amount: number): string {
  const isNegative = amount < 0;
  const rounded = Math.round(Math.abs(amount));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}$${formatted} COP`;
}

export function formatShortCOP(amount: number): string {
  const isNegative = amount < 0;
  const rounded = Math.round(Math.abs(amount));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}$${formatted}`;
}

export function formatAxisCOP(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    const label = Number.isInteger(millions)
      ? millions.toString()
      : millions.toFixed(1).replace('.', ',');
    return `$${label}M`;
  }
  return `$${Math.round(amount / 1000)} mil`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatDayDateLabel(day: number): string {
  return `${day} nov 2026`;
}

export function formatFullDateLabel(day: number): string {
  return `${day} de noviembre de 2026`;
}

export function formatSpanishDateFromISO(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const monthLabel = months[month - 1] ?? '';
  return `${day} de ${monthLabel} de ${year}`;
}

export function getBudgetDashboardData(
  movements: BudgetMovement[],
  baseMonthlyBudget: number = MONTHLY_BUDGET_COP,
) {
  const expensesOnly = movements.filter(
    (item): item is ExpenseRecord => item.type === 'expense',
  );
  const totalIncome = movements
    .filter((item) => item.type === 'income')
    .reduce((acc, item) => acc + item.amount, 0);

  const effectiveBudget = baseMonthlyBudget + totalIncome;
  const totalSpent = expensesOnly.reduce((acc, item) => acc + item.amount, 0);
  const availableBalance = effectiveBudget - totalSpent;
  const spentPercentage =
    effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0;
  const availablePercentage = Math.max(0, 100 - spentPercentage);

  const highestExpenseDay = expensesOnly.reduce(
    (max, item) => (item.day > max ? item.day : max),
    CURRENT_DAY_OF_MONTH,
  );

  const dailyAverageSpent = totalSpent / highestExpenseDay;
  const remainingDays = Math.max(0, TOTAL_DAYS_IN_MONTH - highestExpenseDay);
  const dailyAvailableMargin =
    remainingDays > 0
      ? Math.max(0, availableBalance) / remainingDays
      : Math.max(0, availableBalance);

  let runningCumulative = 0;
  const dailySeries: DailyExpensePoint[] = [];

  for (let day = 1; day <= TOTAL_DAYS_IN_MONTH; day += 1) {
    const isFuture = day > highestExpenseDay;
    const dayItems = expensesOnly.filter((item) => item.day === day);
    const byCategory: Record<ExpenseCategory, number> = {
      [ExpenseCategory.Alimentacion]: 0,
      [ExpenseCategory.Transporte]: 0,
      [ExpenseCategory.Servicios]: 0,
      [ExpenseCategory.Ropa]: 0,
      [ExpenseCategory.Entretenimiento]: 0,
    };

    let dayAmount = 0;
    for (const item of dayItems) {
      dayAmount += item.amount;
      byCategory[item.category] += item.amount;
    }

    if (!isFuture) {
      runningCumulative += dayAmount;
    }

    dailySeries.push({
      day,
      dateLabel: `${day} de noviembre, 2026`,
      shortDate: `${day} nov`,
      amount: dayAmount,
      cumulativeAmount: runningCumulative,
      isFuture,
      byCategory,
      items: dayItems,
    });
  }

  // Chronological newest-first order (by day desc, then insertion order desc)
  const chronologicalMovements = [...movements]
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      if (b.item.day !== a.item.day) return b.item.day - a.item.day;
      return b.idx - a.idx;
    })
    .map((entry) => entry.item);

  const recentMovements = chronologicalMovements.slice(0, 5);

  const categoryBreakdown: CategoryBreakdown[] = CATEGORY_LIST.map((meta) => {
    const matching = expensesOnly.filter((item) => item.category === meta.id);
    const total = matching.reduce((sum, item) => sum + item.amount, 0);
    return {
      meta,
      total,
      percentageOfSpent: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
      count: matching.length,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    monthName: MONTH_NAME,
    currentDay: highestExpenseDay,
    totalDays: TOTAL_DAYS_IN_MONTH,
    remainingDays,
    baseMonthlyBudget,
    totalIncome,
    monthlyBudget: effectiveBudget,
    totalSpent,
    availableBalance,
    spentPercentage,
    availablePercentage,
    dailyAverageSpent,
    dailyAvailableMargin,
    dailySeries,
    chronologicalMovements,
    recentMovements,
    categoryBreakdown,
  };
}
