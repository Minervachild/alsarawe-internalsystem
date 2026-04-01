import { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, DollarSign, CreditCard, Hash, Building2, CheckCircle, XCircle, Clock, Archive, RotateCcw, Pencil, Undo2, Send, MoreVertical, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BotRegister } from './BotRegister';
import { EditSalesEntryDialog } from './EditSalesEntryDialog';
import { SalesTrackerGrid } from './SalesTrackerGrid';
import { MissingDaysReport } from './MissingDaysReport';
import { DailySummaryRow } from './DailySummaryRow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  status: string;
  posted_to_zoho?: boolean;
  posted_at?: string;
  post_count?: number;
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZoho, setFilterZoho] = useState('all');
  const [showArchive, setShowArchive] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SalesEntry | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editEntry, setEditEntry] = useState<SalesEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [resendConfirm, setResendConfirm] = useState<SalesEntry | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const SALES_TOTAL_ALLOWED_USERS = ['fe6e37be-e84e-484a-9b3d-061f3e3a2215', '140f582c-c377-40b1-8524-e8d5e77adc01'];
  const canSeeTotals = profile ? SALES_TOTAL_ALLOWED_USERS.includes(profile.id) : false;

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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getProofUrl = async (path: string) => {
    if (proofUrls[path]) return proofUrls[path];
    const { data } = await supabase.storage.from('sales-proofs').createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setProofUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const activeEntries = useMemo(() => entries.filter(e => e.status !== 'rejected'), [entries]);
  const archivedEntries = useMemo(() => entries.filter(e => e.status === 'rejected'), [entries]);

  const filteredEntries = useMemo(() => {
    const source = showArchive ? archivedEntries : activeEntries;
    return source.filter((entry) => {
      if (filterDate && entry.date !== filterDate) return false;
      if (filterBranch !== 'all' && entry.branch_id !== filterBranch) return false;
      if (filterShift !== 'all' && entry.shift !== filterShift) return false;
      if (!showArchive && filterStatus !== 'all' && entry.status !== filterStatus) return false;
      if (filterZoho === 'posted' && !(entry as any).posted_to_zoho) return false;
      if (filterZoho === 'not_posted' && (entry as any).posted_to_zoho) return false;
      if (filterZoho === 'resent' && ((entry as any).post_count || 0) <= 1) return false;
      return true;
    });
  }, [activeEntries, archivedEntries, showArchive, filterDate, filterBranch, filterShift, filterStatus, filterZoho]);

  const markPosted = async (entryId: string, isResend: boolean) => {
    const entry = entries.find(e => e.id === entryId);
    const currentCount = (entry as any)?.post_count || 0;
    await supabase
      .from('sales_entries')
      .update({
        posted_to_zoho: true,
        posted_at: new Date().toISOString(),
        posted_by: user?.id,
        post_count: currentCount + 1,
      } as any)
      .eq('id', entryId);

    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, posted_to_zoho: true, posted_at: new Date().toISOString(), post_count: currentCount + 1 } as any
        : e
    ));
  };

  const handleApprove = async (entry: SalesEntry) => {
    // Check if already posted — require confirmation for re-approve
    if ((entry as any).posted_to_zoho) {
      setResendConfirm(entry);
      return;
    }
    await doApprove(entry);
  };

  const doApprove = async (entry: SalesEntry) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const { error } = await supabase
        .from('sales_entries')
        .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', entry.id);
      if (error) throw error;

      const branchName = (entry as any).branches?.name || '';
      const employeeName = (entry as any).employees?.name || '';
      const total = Number(entry.cash_amount) + Number(entry.card_amount);

      const shiftLabel = entry.shift === 'morning' ? 'صباحية' : 'مسائية';
      const reference = `مبيعات ${branchName} - ${entry.date} - ${shiftLabel}`;

      const webhookPayload = {
        type: 'sales',
        entry_id: entry.id,
        reference,
        branch: branchName,
        date: entry.date,
        shift: shiftLabel,
        cash_amount: entry.cash_amount,
        card_amount: entry.card_amount,
        total,
        transaction_count: entry.transaction_count,
        employee: employeeName,
        prompt: `سجل مبيعات ${branchName} بتاريخ ${entry.date} وردية ${shiftLabel} - كاش: ${entry.cash_amount} ريال، شبكة: ${entry.card_amount} ريال، الإجمالي: ${total} ريال، عدد العمليات: ${entry.transaction_count}، الموظف: ${employeeName}، المرجع: ${reference}`,
      };

      const { data: webhookResult } = await supabase.functions.invoke('send-to-webhook', { body: webhookPayload });

      // Mark as posted to Zoho
      await markPosted(entry.id, false);

      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved' } : e));

      if (webhookResult?.response) {
        const agentResponse = typeof webhookResult.response === 'string' ? webhookResult.response : JSON.stringify(webhookResult.response, null, 2);
        toast({ title: 'Sale approved', description: agentResponse });
      } else {
        toast({ title: 'Sale approved & sent to Zoho agent' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleReject = async (entry: SalesEntry) => {
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const { error } = await supabase.from('sales_entries').update({ status: 'rejected' }).eq('id', entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'rejected' } : e));
      toast({ title: 'Sale rejected & archived' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleRestore = async (entry: SalesEntry) => {
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const { error } = await supabase.from('sales_entries').update({ status: 'submitted' }).eq('id', entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'submitted' } : e));
      toast({ title: 'Sale restored to submitted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleRevoke = async (entry: SalesEntry) => {
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const { error } = await supabase
        .from('sales_entries')
        .update({ status: 'submitted', approved_by: null, approved_at: null })
        .eq('id', entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'submitted', approved_by: null, approved_at: null } as any : e));
      toast({ title: 'Approval revoked — entry is submitted again' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleResendWebhook = async (entry: SalesEntry) => {
    // Check if already posted — require confirmation
    if ((entry as any).posted_to_zoho) {
      setResendConfirm(entry);
      return;
    }
    await doResendWebhook(entry);
  };

  const doResendWebhook = async (entry: SalesEntry) => {
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const branchName = (entry as any).branches?.name || '';
      const employeeName = (entry as any).employees?.name || '';
      const total = Number(entry.cash_amount) + Number(entry.card_amount);

      await supabase.functions.invoke('send-to-webhook', {
        body: {
          type: 'sales',
          entry_id: entry.id,
          branch: branchName,
          date: entry.date,
          shift: entry.shift === 'morning' ? 'صباحية' : 'مسائية',
          cash_amount: entry.cash_amount,
          card_amount: entry.card_amount,
          total,
          transaction_count: entry.transaction_count,
          employee: employeeName,
          prompt: `سجل مبيعات ${branchName} بتاريخ ${entry.date} وردية ${entry.shift === 'morning' ? 'صباحية' : 'مسائية'} - كاش: ${entry.cash_amount} ريال، شبكة: ${entry.card_amount} ريال، الإجمالي: ${total} ريال، عدد العمليات: ${entry.transaction_count}، الموظف: ${employeeName}`,
        },
      });

      await markPosted(entry.id, true);
      toast({ title: 'Webhook resent successfully' });
    } catch (error: any) {
      toast({ title: 'Error resending', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleBulkResendWebhook = async () => {
    const entriesToSend = filteredEntries.filter(e => selectedIds.has(e.id));
    if (entriesToSend.length === 0) return;
    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const entry of entriesToSend) {
      try {
        const branchName = (entry as any).branches?.name || '';
        const employeeName = (entry as any).employees?.name || '';
        const total = Number(entry.cash_amount) + Number(entry.card_amount);

        await supabase.functions.invoke('send-to-webhook', {
          body: {
            type: 'sales',
            entry_id: entry.id,
            branch: branchName,
            date: entry.date,
            shift: entry.shift === 'morning' ? 'صباحية' : 'مسائية',
            cash_amount: entry.cash_amount,
            card_amount: entry.card_amount,
            total,
            transaction_count: entry.transaction_count,
            employee: employeeName,
            prompt: `سجل مبيعات ${branchName} بتاريخ ${entry.date} وردية ${entry.shift === 'morning' ? 'صباحية' : 'مسائية'} - كاش: ${entry.cash_amount} ريال، شبكة: ${entry.card_amount} ريال، الإجمالي: ${total} ريال، عدد العمليات: ${entry.transaction_count}، الموظف: ${employeeName}`,
          },
        });
        await markPosted(entry.id, true);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setSelectedIds(new Set());
    setBulkSending(false);
    toast({
      title: `Bulk webhook sent`,
      description: `${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });
  };

  const getZohoBadge = (entry: SalesEntry) => {
    const postCount = (entry as any).post_count || 0;
    const posted = (entry as any).posted_to_zoho;
    
    if (postCount > 1) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          🔵 Resent
        </span>
      );
    }
    if (posted) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          🟢 Sent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        🔴 Not Sent
      </span>
    );
  };

  const stats = useMemo(() => {
    const totalCash = filteredEntries.reduce((sum, e) => sum + Number(e.cash_amount), 0);
    const totalCard = filteredEntries.reduce((sum, e) => sum + Number(e.card_amount), 0);
    const totalTransactions = filteredEntries.reduce((sum, e) => sum + e.transaction_count, 0);
    const avgTransactions = filteredEntries.length > 0 ? Math.round(totalTransactions / filteredEntries.length) : 0;

    const dailyMap = new Map<string, { total: number; transactions: number }>();
    for (const e of filteredEntries) {
      const existing = dailyMap.get(e.date) || { total: 0, transactions: 0 };
      existing.total += Number(e.cash_amount) + Number(e.card_amount);
      existing.transactions += e.transaction_count;
      dailyMap.set(e.date, existing);
    }
    const dailyValues = Array.from(dailyMap.values());
    const daysWithData = dailyValues.length;
    const avgDailySales = daysWithData > 0 ? dailyValues.reduce((s, d) => s + d.total, 0) / daysWithData : 0;
    const daysWithTransactions = dailyValues.filter(d => d.transactions > 0);
    const avgCart = daysWithTransactions.length > 0
      ? daysWithTransactions.reduce((s, d) => s + (d.total / d.transactions), 0) / daysWithTransactions.length
      : 0;

    return { totalCash, totalCard, totalTransactions, avgTransactions, total: totalCash + totalCard, avgDailySales, avgCart };
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
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Sales Entries</TabsTrigger>
          <TabsTrigger value="tracker">Daily Tracker</TabsTrigger>
          <TabsTrigger value="missing" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Missing Days
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6">
          {/* Tracker Grid at top */}
          <SalesTrackerGrid entries={entries as any} branches={branches} />

          {/* Filters */}
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch</Label>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shift</Label>
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Zoho Status</Label>
                <Select value={filterZoho} onValueChange={setFilterZoho}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="posted">Sent</SelectItem>
                    <SelectItem value="not_posted">Not Sent</SelectItem>
                    <SelectItem value="resent">Resent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(filterDate || filterBranch !== 'all' || filterShift !== 'all' || filterStatus !== 'all' || filterZoho !== 'all') && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs"
                onClick={() => { setFilterDate(''); setFilterBranch('all'); setFilterShift('all'); setFilterStatus('all'); setFilterZoho('all'); }}>
                Clear filters
              </Button>
            )}
          </div>

          {/* Stats */}
          {canSeeTotals && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Cash Sales</span></div>
                <p className="text-xl font-semibold">﷼{stats.totalCash.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Card Sales</span></div>
                <p className="text-xl font-semibold">﷼{stats.totalCard.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Total Sales</span></div>
                <p className="text-xl font-semibold">﷼{stats.total.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><Hash className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Avg. Transactions</span></div>
                <p className="text-xl font-semibold">{stats.avgTransactions}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Avg Daily Sales</span></div>
                <p className="text-xl font-semibold">﷼{Math.round(stats.avgDailySales).toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-purple-500" /><span className="text-xs text-muted-foreground">Avg Cart</span></div>
                <p className="text-xl font-semibold">﷼{Math.round(stats.avgCart).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Daily Summary when filtering by date */}
          <DailySummaryRow entries={entries as any} filterDate={filterDate} canSeeTotals={canSeeTotals} />

          {/* Sales Table + Bot Register */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {showArchive ? 'Archived (Rejected)' : 'Sales Entries'} ({filteredEntries.length})
                </h3>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={bulkSending}
                      onClick={() => handleBulkResendWebhook()}>
                      {bulkSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Resend {selectedIds.size} to Webhook
                    </Button>
                  )}
                  <Button variant={showArchive ? 'secondary' : 'ghost'} size="sm" className="h-8 text-xs gap-1.5"
                    onClick={() => { setShowArchive(!showArchive); setSelectedIds(new Set()); }}>
                    <Archive className="w-3.5 h-3.5" />
                    {showArchive ? 'Back to Active' : `Archive (${archivedEntries.length})`}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 w-8">
                        <Checkbox
                          checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds(new Set(filteredEntries.map(e => e.id)));
                            else setSelectedIds(new Set());
                          }}
                        />
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Branch</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Shift</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                      {canSeeTotals && <th className="text-right p-3 font-medium text-muted-foreground">Total</th>}
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Zoho</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Proof</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={canSeeTotals ? 10 : 9} className="p-8 text-center text-muted-foreground">No sales entries found</td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id}
                          className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${selectedEntry?.id === entry.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedEntry(entry)}>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.has(entry.id)}
                              onCheckedChange={(checked) => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(entry.id); else next.delete(entry.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
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
                          <td className="p-3 text-muted-foreground">{(entry as any).employees?.name || '—'}</td>
                          {canSeeTotals && (
                            <td className="p-3 text-right font-semibold">﷼{(Number(entry.cash_amount) + Number(entry.card_amount)).toLocaleString()}</td>
                          )}
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                              entry.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : entry.status === 'rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {entry.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                               entry.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                               <Clock className="w-3 h-3" />}
                              {entry.status === 'approved' ? 'Approved' : entry.status === 'rejected' ? 'Rejected' : 'Submitted'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {getZohoBadge(entry)}
                          </td>
                          <td className="p-3 text-center">
                            <Button variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={async (e) => { e.stopPropagation(); const url = await getProofUrl(entry.proof_image_url); if (url) window.open(url, '_blank'); }}>
                              View
                            </Button>
                          </td>
                          <td className="p-3 text-center">
                            {showArchive ? (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={processingIds.has(entry.id)}
                                onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}>
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                              </Button>
                            ) : entry.status === 'submitted' ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  disabled={processingIds.has(entry.id)}
                                  onClick={(e) => { e.stopPropagation(); handleApprove(entry); }}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={processingIds.has(entry.id)}
                                  onClick={(e) => { e.stopPropagation(); handleReject(entry); }}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : entry.status === 'approved' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResendWebhook(entry); }}
                                    disabled={processingIds.has(entry.id)}>
                                    <Send className="w-3.5 h-3.5 mr-2" /> Resend to Webhook
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRevoke(entry); }}
                                    disabled={processingIds.has(entry.id)} className="text-amber-600 focus:text-amber-600">
                                    <Undo2 className="w-3.5 h-3.5 mr-2" /> Revoke Approval
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReject(entry); }}
                                    disabled={processingIds.has(entry.id)} className="text-destructive focus:text-destructive">
                                    <XCircle className="w-3.5 h-3.5 mr-2" /> Reject & Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
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
              <BotRegister entry={selectedEntry} branchName={(selectedEntry as any)?.branches?.name} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tracker">
          <SalesTrackerGrid entries={entries as any} branches={branches} />
        </TabsContent>

        <TabsContent value="missing">
          <MissingDaysReport entries={entries as any} branches={branches} />
        </TabsContent>
      </Tabs>

      {/* Resend Confirmation Dialog */}
      <AlertDialog open={!!resendConfirm} onOpenChange={(open) => !open && setResendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ This entry was already sent</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to resend? This entry will be flagged as "Resent" for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (resendConfirm) {
                if (resendConfirm.status === 'submitted') {
                  doApprove(resendConfirm);
                } else {
                  doResendWebhook(resendConfirm);
                }
              }
              setResendConfirm(null);
            }}>
              Resend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSalesEntryDialog entry={editEntry} branches={branches} open={editOpen} onOpenChange={setEditOpen} onUpdated={fetchData} />
    </div>
  );
}
