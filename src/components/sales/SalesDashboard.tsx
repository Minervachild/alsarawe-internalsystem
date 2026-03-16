import { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, DollarSign, CreditCard, Hash, Building2, CheckCircle, XCircle, Clock, Archive, RotateCcw, Pencil, Undo2, Send, MoreVertical } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BotRegister } from './BotRegister';
import { EditSalesEntryDialog } from './EditSalesEntryDialog';
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
  const [showArchive, setShowArchive] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SalesEntry | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editEntry, setEditEntry] = useState<SalesEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { user } = useAuth();
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

  const activeEntries = useMemo(() => {
    return entries.filter(e => e.status !== 'rejected');
  }, [entries]);

  const archivedEntries = useMemo(() => {
    return entries.filter(e => e.status === 'rejected');
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const source = showArchive ? archivedEntries : activeEntries;
    return source.filter((entry) => {
      if (filterDate && entry.date !== filterDate) return false;
      if (filterBranch !== 'all' && entry.branch_id !== filterBranch) return false;
      if (filterShift !== 'all' && entry.shift !== filterShift) return false;
      if (!showArchive && filterStatus !== 'all' && entry.status !== filterStatus) return false;
      return true;
    });
  }, [activeEntries, archivedEntries, showArchive, filterDate, filterBranch, filterShift, filterStatus]);

  const handleApprove = async (entry: SalesEntry) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const { error } = await supabase
        .from('sales_entries')
        .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', entry.id);
      if (error) throw error;

      // Send to unified webhook
      const branchName = (entry as any).branches?.name || '';
      const employeeName = (entry as any).employees?.name || '';
      const total = Number(entry.cash_amount) + Number(entry.card_amount);

      const webhookPayload = {
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
      };

      const { data: webhookResult } = await supabase.functions.invoke('send-to-webhook', {
        body: webhookPayload,
      });

      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved' } : e));

      if (webhookResult?.response) {
        const agentResponse = typeof webhookResult.response === 'string'
          ? webhookResult.response
          : JSON.stringify(webhookResult.response, null, 2);
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
      const { error } = await supabase
        .from('sales_entries')
        .update({ status: 'rejected' })
        .eq('id', entry.id);
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
      const { error } = await supabase
        .from('sales_entries')
        .update({ status: 'pending' })
        .eq('id', entry.id);
      if (error) throw error;

      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'pending' } : e));
      toast({ title: 'Sale restored to pending' });
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
        .update({ status: 'pending', approved_by: null, approved_at: null })
        .eq('id', entry.id);
      if (error) throw error;

      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'pending', approved_by: null, approved_at: null } as any : e));
      toast({ title: 'Approval revoked — entry is pending again' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

  const handleResendWebhook = async (entry: SalesEntry) => {
    setProcessingIds(prev => new Set(prev).add(entry.id));
    try {
      const branchName = (entry as any).branches?.name || '';
      const employeeName = (entry as any).employees?.name || '';
      const total = Number(entry.cash_amount) + Number(entry.card_amount);

      const webhookPayload = {
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
      };

      const { data: webhookResult } = await supabase.functions.invoke('send-to-webhook', {
        body: webhookPayload,
      });

      if (webhookResult?.response) {
        const agentResponse = typeof webhookResult.response === 'string'
          ? webhookResult.response
          : JSON.stringify(webhookResult.response, null, 2);
        toast({ title: 'Webhook resent', description: agentResponse });
      } else {
        toast({ title: 'Webhook resent successfully' });
      }
    } catch (error: any) {
      toast({ title: 'Error resending', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => { setFilterDate(''); setFilterBranch('all'); setFilterShift('all'); setFilterStatus('all'); }}
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
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">
              {showArchive ? 'Archived (Rejected)' : 'Sales Entries'} ({filteredEntries.length})
            </h3>
            <Button
              variant={showArchive ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowArchive(!showArchive)}
            >
              <Archive className="w-3.5 h-3.5" />
              {showArchive ? 'Back to Active' : `Archive (${archivedEntries.length})`}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Shift</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Proof</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
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
                      <td className="p-3 text-right font-semibold">
                        ﷼{(Number(entry.cash_amount) + Number(entry.card_amount)).toLocaleString()}
                      </td>
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
                          {entry.status === 'approved' ? 'Approved' : entry.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
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
                      <td className="p-3 text-center">
                        {showArchive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={processingIds.has(entry.id)}
                            onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </Button>
                        ) : entry.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              disabled={processingIds.has(entry.id)}
                              onClick={(e) => { e.stopPropagation(); handleApprove(entry); }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={processingIds.has(entry.id)}
                              onClick={(e) => { e.stopPropagation(); handleReject(entry); }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : entry.status === 'approved' ? (
                          <div className="flex items-center justify-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleResendWebhook(entry); }}
                                  disabled={processingIds.has(entry.id)}
                                >
                                  <Send className="w-3.5 h-3.5 mr-2" />
                                  Resend to Webhook
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleRevoke(entry); }}
                                  disabled={processingIds.has(entry.id)}
                                  className="text-amber-600 focus:text-amber-600"
                                >
                                  <Undo2 className="w-3.5 h-3.5 mr-2" />
                                  Revoke Approval
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleReject(entry); }}
                                  disabled={processingIds.has(entry.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-2" />
                                  Reject & Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setEditOpen(true); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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
          <BotRegister
            entry={selectedEntry}
            branchName={(selectedEntry as any)?.branches?.name}
          />
        </div>
      </div>

      <EditSalesEntryDialog
        entry={editEntry}
        branches={branches}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={fetchData}
      />
    </div>
  );
}
