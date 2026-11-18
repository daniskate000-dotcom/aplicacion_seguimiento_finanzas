import {
  Bus,
  Clapperboard,
  Lightbulb,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import { CATEGORY_META } from '../data/budgetData';
import { ExpenseCategory } from '../types/budget';

interface CategoryIconProps {
  category?: ExpenseCategory;
  isIncome?: boolean;
  size?: 'sm' | 'md';
}

export function CategoryIcon({
  category,
  isIncome = false,
  size = 'md',
}: CategoryIconProps) {
  const containerSize =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';

  if (isIncome) {
    return (
      <div
        className={`${containerSize} flex shrink-0 items-center justify-center bg-emerald-50 text-emerald-700`}
        aria-hidden="true"
      >
        <span className={size === 'sm' ? 'text-sm' : 'text-base'}>💰</span>
      </div>
    );
  }

  const resolvedCategory = category ?? ExpenseCategory.Alimentacion;
  const meta = CATEGORY_META[resolvedCategory];

  const renderIcon = () => {
    switch (resolvedCategory) {
      case ExpenseCategory.Alimentacion:
        return <Utensils className={iconSize} aria-hidden="true" />;
      case ExpenseCategory.Transporte:
        return <Bus className={iconSize} aria-hidden="true" />;
      case ExpenseCategory.Servicios:
        return <Lightbulb className={iconSize} aria-hidden="true" />;
      case ExpenseCategory.Ropa:
        return <ShoppingBag className={iconSize} aria-hidden="true" />;
      case ExpenseCategory.Entretenimiento:
        return <Clapperboard className={iconSize} aria-hidden="true" />;
    }
  };

  return (
    <div
      className={`${containerSize} ${meta.iconBg} ${meta.iconText} flex shrink-0 items-center justify-center`}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
