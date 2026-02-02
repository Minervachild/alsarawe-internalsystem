import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-semibold tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={`inline-flex items-center gap-1 text-sm font-medium mt-2 ${
              trend.isPositive ? 'text-success' : 'text-destructive'
            }`}>
              <span className="text-xs">{trend.isPositive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}% from last week
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
