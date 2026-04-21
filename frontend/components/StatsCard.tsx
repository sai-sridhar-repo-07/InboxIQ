import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: number;
    label: string;
  };
  onClick?: () => void;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50 dark:bg-primary-900/30',
  trend,
  onClick,
  className,
}: StatsCardProps) {
  const trendPositive = trend && trend.value > 0;
  const trendNegative = trend && trend.value < 0;

  return (
    <div
      className={clsx(
        'card p-5 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              {trendPositive && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
              {trendNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              {!trendPositive && !trendNegative && <Minus className="h-3.5 w-3.5 text-gray-400" />}
              <span
                className={clsx(
                  'text-xs font-medium',
                  trendPositive && 'text-green-600',
                  trendNegative && 'text-red-600',
                  !trendPositive && !trendNegative && 'text-gray-500 dark:text-gray-400'
                )}
              >
                {trendPositive && '+'}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl', iconBg)}>
          <Icon className={clsx('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  );
}
