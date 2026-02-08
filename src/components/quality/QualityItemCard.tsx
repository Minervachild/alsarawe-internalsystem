import { format } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2, Play, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface QualityItem {
  id: string;
  section_id: string;
  name: string;
  cycle_days: number;
  position: number;
}

export interface QualityReview {
  id: string;
  item_id: string;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  improvement_target: string | null;
  employee_name?: string;
}

interface QualityItemCardProps {
  item: QualityItem;
  lastReview: QualityReview | null;
  isAdmin: boolean;
  onPerformReview: (item: QualityItem) => void;
  onManageCriteria: (item: QualityItem) => void;
  onViewHistory: (item: QualityItem) => void;
}

function parseDateLocal(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getStatus(lastReview: QualityReview | null, cycleDays: number): 'overdue' | 'due' | 'upcoming' | 'no-review' {
  if (!lastReview) return 'no-review';
  const lastDate = parseDateLocal(lastReview.performed_at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= cycleDays) return 'overdue';
  if (diffDays >= cycleDays - 1) return 'due';
  return 'upcoming';
}

function getNextDueDate(lastReview: QualityReview | null, cycleDays: number): Date | null {
  if (!lastReview) return null;
  const lastDate = parseDateLocal(lastReview.performed_at);
  return new Date(lastDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);
}

function getCycleLabel(days: number): string {
  if (days === 1) return 'Every day';
  if (days === 7) return 'Every week';
  if (days === 14) return 'Every 2 weeks';
  if (days === 30) return 'Every month';
  return `Every ${days} days`;
}

export function QualityItemCard({ item, lastReview, isAdmin, onPerformReview, onManageCriteria, onViewHistory }: QualityItemCardProps) {
  const status = getStatus(lastReview, item.cycle_days);
  const nextDue = getNextDueDate(lastReview, item.cycle_days);

  return (
    <div className="card-premium p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{getCycleLabel(item.cycle_days)}</span>
          </div>
        </div>
        {status === 'overdue' && (
          <Badge variant="destructive" className="rounded-full text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        )}
        {status === 'due' && (
          <Badge className="rounded-full text-xs bg-warning text-warning-foreground">
            Due Today
          </Badge>
        )}
        {status === 'upcoming' && (
          <Badge variant="outline" className="rounded-full text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            On Track
          </Badge>
        )}
        {status === 'no-review' && (
          <Badge variant="secondary" className="rounded-full text-xs">
            No Reviews
          </Badge>
        )}
      </div>

      {/* Last review info */}
      <div className="bg-muted/30 rounded-xl p-3 space-y-1">
        {lastReview ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last reviewed:</span>
              <span className="font-medium">{format(parseDateLocal(lastReview.performed_at), 'MMM d, yyyy')}</span>
            </div>
            {lastReview.employee_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">By:</span>
                <span className="font-medium">{lastReview.employee_name}</span>
              </div>
            )}
            {nextDue && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Next due:</span>
                <span className={`font-medium ${status === 'overdue' ? 'text-destructive' : status === 'due' ? 'text-warning' : ''}`}>
                  {format(nextDue, 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {lastReview.improvement_target && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground">Target for next review:</p>
                <p className="text-sm font-medium text-foreground">{lastReview.improvement_target}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center">No reviews performed yet</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => onPerformReview(item)} className="flex-1 rounded-xl" size="sm">
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Review
        </Button>
        <Button onClick={() => onViewHistory(item)} variant="outline" className="rounded-xl" size="sm">
          <History className="w-3.5 h-3.5" />
        </Button>
        {isAdmin && (
          <Button onClick={() => onManageCriteria(item)} variant="outline" className="rounded-xl" size="sm">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
