import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parse } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  status: string;
  posted_to_zoho?: boolean;
  branches?: { name: string };
  employees?: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

const EXTERNAL_BRANCH_NAMES = ['افنتات خارجية', 'Mawhoob', 'External Events'];

function isExternalBranch(name: string) {
  return EXTERNAL_BRANCH_NAMES.some(n => name.includes(n) || n.includes(name));
}

type ViewMode = 'day' | 'month' | 'custom';

interface Props {
  entries: SalesEntry[];
  branches: Branch[];
}

export function SalesTrackerGrid({ entries, branches }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dates = useMemo(() => {
    if (viewMode === 'day') {
      return [format(selectedDate, 'yyyy-MM-dd')];
    }
    if (viewMode === 'month') {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    }
    if (viewMode === 'custom' && customFrom && customTo) {
      try {
        const start = parse(customFrom, 'yyyy-MM-dd', new Date());
        const end = parse(customTo, 'yyyy-MM-dd', new Date());
        if (start <= end) {
          return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
        }
      } catch { /* invalid */ }
    }
    return [];
  }, [viewMode, selectedDate, selectedMonth, customFrom, customTo]);

  const dateSet = useMemo(() => new Set(dates), [dates]);

  const relevantEntries = useMemo(() => {
    return entries.filter(e => dateSet.has(e.date));
  }, [entries, dateSet]);

  const getStatus = (branchId: string, shift: string, dateStr: string) => {
    const entry = relevantEntries.find(e => e.branch_id === branchId && e.shift === shift && e.date === dateStr);
    if (!entry) return 'missing';
    if (entry.status === 'approved' && (entry as any).posted_to_zoho) return 'posted';
    if (entry.status === 'approved') return 'approved';
    if (entry.status === 'submitted') return 'pending';
    return 'missing';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'posted':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Sent</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> ✅</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"><Clock className="w-3.5 h-3.5" /> ⏳</span>;
      case 'na':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Circle className="w-3.5 h-3.5" /> ⚪</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> ❌</span>;
    }
  };

  const nonExternalBranches = branches.filter(b => !isExternalBranch(b.name));
  const totalExpected = nonExternalBranches.length * 2 * dates.length;
  const totalSubmitted = relevantEntries.filter(e => e.status !== 'rejected').length;
  const totalPosted = relevantEntries.filter(e => (e as any).posted_to_zoho).length;

  // For multi-day view, aggregate per date
  const isMultiDay = dates.length > 1;

  return (
    <div className="card-premium p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground">Daily Sales Register</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Single Day</SelectItem>
              <SelectItem value="month">Full Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'day' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {viewMode === 'month' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {format(selectedMonth, 'MMMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(d) => d && setSelectedMonth(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {viewMode === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">From</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 text-xs w-[140px]" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">To</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 text-xs w-[140px]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {dates.length === 0 && viewMode === 'custom' ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Select a valid date range to view the register.</p>
      ) : isMultiDay ? (
        /* Multi-day: one row per date, columns = branches */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-card z-10">Date</th>
                {branches.map(branch => (
                  <th key={branch.id} className="text-center p-2 font-medium text-muted-foreground" colSpan={2}>
                    {branch.name}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <th className="sticky left-0 bg-card z-10"></th>
                {branches.map(branch => (
                  <>{/* Fragment key handled by unique combo */}
                    <th key={`${branch.id}-am`} className="text-center p-1 text-[10px] text-muted-foreground font-normal">AM</th>
                    <th key={`${branch.id}-pm`} className="text-center p-1 text-[10px] text-muted-foreground font-normal">PM</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map(dateStr => (
                <tr key={dateStr} className="border-b border-border/50">
                  <td className="p-2 font-medium text-xs whitespace-nowrap sticky left-0 bg-card z-10">
                    {format(new Date(dateStr), 'MMM dd')}
                  </td>
                  {branches.map(branch => {
                    const external = isExternalBranch(branch.name);
                    const morningStatus = external
                      ? (getStatus(branch.id, 'morning', dateStr) === 'missing' ? 'na' : getStatus(branch.id, 'morning', dateStr))
                      : getStatus(branch.id, 'morning', dateStr);
                    const nightStatus = external ? 'na' : getStatus(branch.id, 'night', dateStr);
                    return (
                      <>{/* Fragment */}
                        <td key={`${branch.id}-${dateStr}-am`} className="p-1 text-center">
                          <StatusIcon status={morningStatus} />
                        </td>
                        <td key={`${branch.id}-${dateStr}-pm`} className="p-1 text-center">
                          <StatusIcon status={nightStatus} />
                        </td>
                      </>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Single day view (original layout) */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-muted-foreground">Branch</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Morning</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Night</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => {
                const external = isExternalBranch(branch.name);
                const dateStr = dates[0];
                return (
                  <tr key={branch.id} className="border-b border-border/50">
                    <td className="p-2 font-medium">{branch.name}</td>
                    <td className="p-2 text-center">
                      <StatusIcon status={external ? (getStatus(branch.id, 'morning', dateStr) === 'missing' ? 'na' : getStatus(branch.id, 'morning', dateStr)) : getStatus(branch.id, 'morning', dateStr)} />
                    </td>
                    <td className="p-2 text-center">
                      {external ? (
                        <StatusIcon status="na" />
                      ) : (
                        <StatusIcon status={getStatus(branch.id, 'night', dateStr)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>{totalSubmitted}/{totalExpected} registered</span>
        <span>{totalPosted}/{totalSubmitted} sent to Zoho</span>
        {totalSubmitted >= totalExpected && totalExpected > 0 ? (
          <span className="text-emerald-600 font-medium">✅ Complete</span>
        ) : (
          <span className="text-red-600 font-medium">❌ Incomplete</span>
        )}
      </div>
    </div>
  );
}
