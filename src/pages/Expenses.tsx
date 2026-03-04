import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, X, Receipt, Store, Wallet, CreditCard, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Seller { id: string; name: string }
interface Account { id: string; name: string }
interface PaymentMethod { id: string; name: string }
interface Expense {
  id: string;
  seller_id: string | null;
  account_id: string | null;
  payment_method_id: string | null;
  invoice_number: string | null;
  amount: number;
  vat_included: boolean;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  expense_sellers?: { name: string } | null;
  expense_accounts?: { name: string } | null;
  expense_payment_methods?: { name: string } | null;
}

export default function Expenses() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form state
  const [sellerId, setSellerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [vatIncluded, setVatIncluded] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings inline add
  const [newSeller, setNewSeller] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [s, a, p, e] = await Promise.all([
      supabase.from('expense_sellers').select('id, name').order('name'),
      supabase.from('expense_accounts').select('id, name').order('name'),
      supabase.from('expense_payment_methods').select('id, name').order('name'),
      supabase.from('daily_expenses')
        .select('*, expense_sellers(name), expense_accounts(name), expense_payment_methods(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setSellers(s.data || []);
    setAccounts(a.data || []);
    setPaymentMethods(p.data || []);
    setExpenses((e.data as any[]) || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sellerId || !accountId) {
      toast({ title: 'Please fill seller, account, and amount', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('daily_expenses').insert({
        seller_id: sellerId || null,
        account_id: accountId || null,
        payment_method_id: paymentMethodId || null,
        invoice_number: invoiceNumber || null,
        amount: parseFloat(amount),
        vat_included: vatIncluded,
        date,
        notes: notes || null,
        created_by: user?.id,
      });
      if (error) throw error;

      // Reset form (keep date & payment method for quick repeat)
      setSellerId('');
      setAccountId('');
      setInvoiceNumber('');
      setAmount('');
      setNotes('');
      toast({ title: 'Expense added' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('daily_expenses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Expense deleted' });
    }
  };

  // Settings helpers
  const addSeller = async () => {
    if (!newSeller.trim()) return;
    const { error } = await supabase.from('expense_sellers').insert({ name: newSeller.trim() });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewSeller('');
    const { data } = await supabase.from('expense_sellers').select('id, name').order('name');
    setSellers(data || []);
  };
  const deleteSeller = async (id: string) => {
    await supabase.from('expense_sellers').delete().eq('id', id);
    setSellers(prev => prev.filter(s => s.id !== id));
  };
  const addAccount = async () => {
    if (!newAccount.trim()) return;
    const { error } = await supabase.from('expense_accounts').insert({ name: newAccount.trim() });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewAccount('');
    const { data } = await supabase.from('expense_accounts').select('id, name').order('name');
    setAccounts(data || []);
  };
  const deleteAccount = async (id: string) => {
    await supabase.from('expense_accounts').delete().eq('id', id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };
  const addPaymentMethod = async () => {
    if (!newPaymentMethod.trim()) return;
    const { error } = await supabase.from('expense_payment_methods').insert({ name: newPaymentMethod.trim() });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewPaymentMethod('');
    const { data } = await supabase.from('expense_payment_methods').select('id, name').order('name');
    setPaymentMethods(data || []);
  };
  const deletePaymentMethod = async (id: string) => {
    await supabase.from('expense_payment_methods').delete().eq('id', id);
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
  };

  // Today's total
  const todayTotal = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return expenses
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Daily Expenses</h1>
            <p className="text-muted-foreground">Quick entry for repetitive daily invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="card-premium px-4 py-2">
              <span className="text-xs text-muted-foreground">Today's Total</span>
              <p className="text-lg font-semibold">﷼{todayTotal.toLocaleString()}</p>
            </div>
            {isAdmin && (
              <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="card-premium p-5 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Add Expense
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Seller *</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select seller..." />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice #</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox checked={vatIncluded} onCheckedChange={(v) => setVatIncluded(v === true)} id="vat" />
              <Label htmlFor="vat" className="text-sm cursor-pointer">VAT Included</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="h-9" />
            </div>
          </div>
          <Button type="submit" className="mt-4 gap-2" disabled={isSubmitting}>
            <Plus className="w-4 h-4" />
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </Button>
        </form>

        {/* Expenses List */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Expenses ({expenses.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Seller</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">VAT</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-center p-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No expenses yet</td></tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3">{format(new Date(exp.date), 'MMM dd')}</td>
                      <td className="p-3 font-medium">{exp.expense_sellers?.name || '—'}</td>
                      <td className="p-3 text-muted-foreground">{exp.expense_accounts?.name || '—'}</td>
                      <td className="p-3 text-muted-foreground">{exp.invoice_number || '—'}</td>
                      <td className="p-3 text-right font-semibold">﷼{Number(exp.amount).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${exp.vat_included ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {exp.vat_included ? 'Incl.' : 'Excl.'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{exp.expense_payment_methods?.name || '—'}</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settings Dialog - Manage sellers, accounts, payment methods */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Expense Options</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="sellers" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="sellers" className="flex-1 gap-1"><Store className="w-3.5 h-3.5" /> Sellers</TabsTrigger>
              <TabsTrigger value="accounts" className="flex-1 gap-1"><Wallet className="w-3.5 h-3.5" /> Accounts</TabsTrigger>
              <TabsTrigger value="methods" className="flex-1 gap-1"><CreditCard className="w-3.5 h-3.5" /> Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="sellers" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Input value={newSeller} onChange={e => setNewSeller(e.target.value)} placeholder="New seller name..." className="h-9"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSeller())} />
                <Button size="sm" className="h-9" onClick={addSeller}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {sellers.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{s.name}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSeller(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {sellers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sellers yet</p>}
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Input value={newAccount} onChange={e => setNewAccount(e.target.value)} placeholder="New account name (e.g. COGS)..." className="h-9"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAccount())} />
                <Button size="sm" className="h-9" onClick={addAccount}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {accounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{a.name}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAccount(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {accounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No accounts yet</p>}
              </div>
            </TabsContent>

            <TabsContent value="methods" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Input value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} placeholder="New payment method..." className="h-9"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPaymentMethod())} />
                <Button size="sm" className="h-9" onClick={addPaymentMethod}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {paymentMethods.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{p.name}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePaymentMethod(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {paymentMethods.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No payment methods yet</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

