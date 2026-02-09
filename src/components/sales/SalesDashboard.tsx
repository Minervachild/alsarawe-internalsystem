import { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, DollarSign, CreditCard, Hash, Building2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BotRegister } from './BotRegister';

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  employee_id: string;
  cash_amount: number;
  card_amount: number;
  transaction_count: number;
  proof_image_url: string;
  created_at: string;
  branches?: { name: string };
  employees?: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

export function SalesDashboard() {
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterShift, setFilterShift] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<SalesEntry | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, branchesRes] = await Promise.all([
        supabase
          .from('sales_entries')
          .select('*, branches(name), employees(name)')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('branches').select('id, name').order('name'),
      ]);

      if (entriesRes.error) throw entriesRes.error;
      setEntries((entriesRes.data as any[]) || []);
      setBranches(branchesRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProofUrl = async (path: string) => {
    if (proofUrls[path]) return proofUrls[path];
    
    const { data } = await supabase.storage
      .from('sales-proofs')
      .createSignedUrl(path, 3600);
    
    if (data?.signedUrl) {
      setProofUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterDate && entry.date !== filterDate) return false;
      if (filterBranch !== 'all' && entry.branch_id !== filterBranch) return false;
      if (filterShift !== 'all' && entry.shift !== filterShift) return false;
      return true;
    });
  }, [entries, filterDate, filterBranch, filterShift]);

  const stats = useMemo(() => {
    const totalCash = filteredEntries.reduce((sum, e) => sum + Number(e.cash_amount), 0);
    const totalCard = filteredEntries.reduce((sum, e) => sum + Number(e.card_amount), 0);
    const totalTransactions = filteredEntries.reduce((sum, e) => sum + e.transaction_count, 0);
    const avgTransactions = filteredEntries.length > 0
      ? Math.round(totalTransactions / filteredEntries.length)
      : 0;

    return { totalCash, totalCard, totalTransactions, avgTransactions, total: totalCash + totalCard };
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-soft text-muted-foreground">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Shift</Label>
            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => { setFilterDate(''); setFilterBranch('all'); setFilterShift('all'); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Cash Sales</span>
          </div>
          <p className="text-xl font-semibold">﷼{stats.totalCash.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Card Sales</span>
          </div>
          <p className="text-xl font-semibold">﷼{stats.totalCard.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Sales</span>
          </div>
          <p className="text-xl font-semibold">﷼{stats.total.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Avg. Transactions</span>
          </div>
          <p className="text-xl font-semibold">{stats.avgTransactions}</p>
        </div>
      </div>

      {/* Dual View: Table + Bot Register */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Table */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Sales Entries ({filteredEntries.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Shift</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cash</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Card</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Txns</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Proof</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No sales entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${
                        selectedEntry?.id === entry.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="p-3">{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {(entry as any).branches?.name || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.shift === 'morning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {entry.shift === 'morning' ? 'Morning' : 'Night'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {(entry as any).employees?.name || '—'}
                      </td>
                      <td className="p-3 text-right font-medium text-green-600">
                        ﷼{Number(entry.cash_amount).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-blue-600">
                        ﷼{Number(entry.card_amount).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        ﷼{(Number(entry.cash_amount) + Number(entry.card_amount)).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">{entry.transaction_count}</td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = await getProofUrl(entry.proof_image_url);
                            if (url) window.open(url, '_blank');
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bot Register */}
        <div>
          <BotRegister
            entry={selectedEntry}
            branchName={(selectedEntry as any)?.branches?.name}
          />
        </div>
      </div>
    </div>
  );
}
