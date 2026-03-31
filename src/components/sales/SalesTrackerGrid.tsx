import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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

interface Props {
  entries: SalesEntry[];
  branches: Branch[];
}

export function SalesTrackerGrid({ entries, branches }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const dayEntries = useMemo(() => {
    return entries.filter(e => e.date === dateStr);
  }, [entries, dateStr]);

  const getStatus = (branchId: string, shift: string) => {
    const entry = dayEntries.find(e => e.branch_id === branchId && e.shift === shift);
    if (!entry) return 'missing';
    if (entry.status === 'approved' && (entry as any).posted_to_zoho) return 'posted';
    if (entry.status === 'approved') return 'approved';
    if (entry.status === 'submitted') return 'pending';
    return 'missing';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'posted':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /> Sent</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /> ✅</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"><Clock className="w-4 h-4" /> ⏳</span>;
      case 'na':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Circle className="w-4 h-4" /> ⚪</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><XCircle className="w-4 h-4" /> ❌</span>;
    }
  };

  const totalExpected = branches.filter(b => !isExternalBranch(b.name)).length * 2;
  const totalSubmitted = dayEntries.filter(e => e.status !== 'rejected').length;
  const totalPosted = dayEntries.filter(e => (e as any).posted_to_zoho).length;

  return (
    <div className="card-premium p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Daily Sales Register</h3>
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
      </div>

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
              return (
                <tr key={branch.id} className="border-b border-border/50">
                  <td className="p-2 font-medium">{branch.name}</td>
                  <td className="p-2 text-center">
                    <StatusIcon status={external ? (getStatus(branch.id, 'morning') === 'missing' ? 'na' : getStatus(branch.id, 'morning')) : getStatus(branch.id, 'morning')} />
                  </td>
                  <td className="p-2 text-center">
                    {external ? (
                      <StatusIcon status="na" />
                    ) : (
                      <StatusIcon status={getStatus(branch.id, 'night')} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalSubmitted}/{totalExpected} registered</span>
        <span>{totalPosted}/{totalSubmitted} sent to Zoho</span>
        {totalSubmitted >= totalExpected ? (
          <span className="text-emerald-600 font-medium">✅ Complete</span>
        ) : (
          <span className="text-red-600 font-medium">❌ Incomplete</span>
        )}
      </div>
    </div>
  );
}