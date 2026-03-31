import { useMemo, useState } from 'react';
import { format, subDays, eachDayOfInterval, max } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Only track from this date forward
const TRACKING_START = new Date('2026-03-31');

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  status: string;
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

export function MissingDaysReport({ entries, branches }: Props) {
  const [filterBranch, setFilterBranch] = useState('all');

  const last30Days = useMemo(() => {
    const end = new Date();
    const start = max([subDays(end, 29), TRACKING_START]);
    if (start > end) return [];
    return eachDayOfInterval({ start, end }).reverse();
  }, []);

  const regularBranches = useMemo(() => branches.filter(b => !isExternalBranch(b.name)), [branches]);
  const filteredBranches = useMemo(() => {
    if (filterBranch === 'all') return regularBranches;
    return regularBranches.filter(b => b.id === filterBranch);
  }, [regularBranches, filterBranch]);

  const entryMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of entries) {
      if (e.status === 'rejected') continue;
      const key = `${e.date}_${e.branch_id}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(e.shift);
    }
    return map;
  }, [entries]);

  const missingCount = useMemo(() => {
    let count = 0;
    for (const day of last30Days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      for (const branch of filteredBranches) {
        const key = `${dateStr}_${branch.id}`;
        const shifts = entryMap.get(key);
        if (!shifts?.has('morning')) count++;
        if (!shifts?.has('night')) count++;
      }
    }
    return count;
  }, [last30Days, filteredBranches, entryMap]);

  return (
    <div className="card-premium overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold">الأيام الناقصة — آخر 30 يوم</h3>
          {missingCount > 0 && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {missingCount} ناقص
            </span>
          )}
        </div>
        <div className="w-40">
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {regularBranches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-right p-2.5 font-medium text-muted-foreground">التاريخ</th>
              {filteredBranches.map(b => (
                <th key={b.id} colSpan={2} className="text-center p-2.5 font-medium text-muted-foreground border-l border-border/50">
                  {b.name}
                </th>
              ))}
            </tr>
            <tr className="text-xs">
              <th></th>
              {filteredBranches.map(b => (
                <>
                  <th key={`${b.id}-m`} className="text-center p-1 text-muted-foreground border-l border-border/50">صباحي</th>
                  <th key={`${b.id}-n`} className="text-center p-1 text-muted-foreground">مسائي</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {last30Days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasAnyMissing = filteredBranches.some(b => {
                const key = `${dateStr}_${b.id}`;
                const shifts = entryMap.get(key);
                return !shifts?.has('morning') || !shifts?.has('night');
              });

              return (
                <tr key={dateStr} className={`border-b border-border/30 ${hasAnyMissing ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                  <td className="p-2 text-right font-medium text-xs">{format(day, 'MMM dd (EEE)')}</td>
                  {filteredBranches.map(b => {
                    const key = `${dateStr}_${b.id}`;
                    const shifts = entryMap.get(key);
                    const hasMorning = shifts?.has('morning');
                    const hasNight = shifts?.has('night');
                    return (
                      <>
                        <td key={`${b.id}-m`} className="p-2 text-center border-l border-border/50">
                          {hasMorning ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td key={`${b.id}-n`} className="p-2 text-center">
                          {hasNight ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
