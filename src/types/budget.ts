export enum ExpenseCategory {
  Alimentacion = 'alimentacion',
  Transporte = 'transporte',
  Servicios = 'servicios',
  Ropa = 'ropa',
  Entretenimiento = 'entretenimiento',
}

export type IncomeCategory =
  | 'Salario'
  | 'Trabajo independiente'
  | 'Negocio'
  | 'Inversiones'
  | 'Regalo'
  | 'Bonificación'
  | 'Reembolso'
  | 'Otro';

export type PaymentMethod =
  | 'Efectivo'
  | 'Cuenta bancaria'
  | 'Nequi'
  | 'Daviplata'
  | 'Tarjeta'
  | 'Otro';

export type MovementType = 'expense' | 'income';

export type ScreenView =
  | 'dashboard'
  | 'movimientos'
  | 'detalle'
  | 'registrar-gasto'
  | 'registrar-ingreso';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  barColor: string;
  dotColor: string;
  iconBg: string;
  iconText: string;
}

export interface ExpenseRecord {
  id: string;
  type: 'expense';
  day: number;
  dateLabel: string;
  timeLabel: string;
  concept: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
}

export interface IncomeRecord {
  id: string;
  type: 'income';
  day: number;
  dateLabel: string;
  fullDateText: string;
  timeLabel: string;
  concept: string;
  incomeCategory: IncomeCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  note?: string;
}

export type BudgetMovement = ExpenseRecord | IncomeRecord;

export interface DailyExpensePoint {
  day: number;
  dateLabel: string;
  shortDate: string;
  amount: number;
  cumulativeAmount: number;
  isFuture: boolean;
  byCategory: Record<ExpenseCategory, number>;
  items: ExpenseRecord[];
}

export interface CategoryBreakdown {
  meta: CategoryMeta;
  total: number;
  percentageOfSpent: number;
  count: number;
}
