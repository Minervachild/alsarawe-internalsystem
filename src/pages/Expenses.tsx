import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, X, Receipt, Store, Wallet, CreditCard, Settings2, Zap, Loader2, Send, FileText, CheckCircle, XCircle, Clock, Archive, RotateCcw, MoreVertical, Undo2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ExpenseBotRegister } from '@/components/expenses/ExpenseBotRegister';
import { InvoiceScanner } from '@/components/expenses/InvoiceScanner';
import { PURCHASE_CATEGORIES, getCategoryById, resolvePaymentAccount, buildZohoPayload } from '@/lib/expenseCategorization';

interface Seller { id: string; name: string }
interface Account { id: string; name: string }
interface PaymentMethod { id: string; name: string }
interface Employee { id: string; name: string }
interface ExpenseTemplate {
  id: string;
  name: string;
  seller_id: string | null;
  account_id: string | null;
  payment_method_id: string | null;
  default_amount: number | null;
  vat_included: boolean;
  notes: string | null;
  webhook_prompt_template: string | null;
  position: number;
}
interface Expense {
  id: string;
  title: string | null;
  seller_id: string | null;
  account_id: string | null;
  payment_method_id: string | null;
  employee_id: string | null;
  invoice_number: string | null;
  amount: number;
  vat_included: boolean;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  expense_sellers?: { name: string } | null;
  expense_accounts?: { name: string } | null;
  expense_payment_methods?: { name: string } | null;
  employees?: { name: string } | null;
}

export default function Expenses() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Form state
  const [title, setTitle] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [vatIncluded, setVatIncluded] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template form state (settings)
  const [tplName, setTplName] = useState('');
  const [tplSellerId, setTplSellerId] = useState('');
  const [tplAccountId, setTplAccountId] = useState('');
  const [tplPaymentMethodId, setTplPaymentMethodId] = useState('');
  const [tplDefaultAmount, setTplDefaultAmount] = useState('');
  const [tplVatIncluded, setTplVatIncluded] = useState(true);
  const [tplNotes, setTplNotes] = useState('');
  const [tplPrompt, setTplPrompt] = useState('');

  // Webhook state
  const [sendingWebhook, setSendingWebhook] = useState<string | null>(null);

  // Edit state (for employee's recent entries)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editSellerId, setEditSellerId] = useState('');
  const [editPurchaseType, setEditPurchaseType] = useState('');
  const [editPaymentMethodId, setEditPaymentMethodId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Scan confirmation state
  const [scanPreview, setScanPreview] = useState<{ invoice_number?: string; vendor_name?: string; payment_type?: string; amount?: number; vat_amount?: number; date?: string; purchase_type?: string } | null>(null);
  const [scanConfirmOpen, setScanConfirmOpen] = useState(false);
  const [addingPurchaseType, setAddingPurchaseType] = useState(false);
  const [newPurchaseTypeName, setNewPurchaseTypeName] = useState('');
  const [customPurchaseTypes, setCustomPurchaseTypes] = useState<string[]>([]);

  const applyScanData = () => {
    if (!scanPreview) return;
    if (scanPreview.invoice_number) setInvoiceNumber(scanPreview.invoice_number);
    if (scanPreview.vendor_name) {
      const matchedSeller = sellers.find(s => s.name.toLowerCase().includes(scanPreview.vendor_name!.toLowerCase()));
      if (matchedSeller) setSellerId(matchedSeller.id);
      else setTitle(scanPreview.vendor_name);
    }
    if (scanPreview.amount) setAmount(String(scanPreview.amount));
    if (scanPreview.payment_type) {
      const matchedPm = paymentMethods.find(p => p.name.toLowerCase().includes(scanPreview.payment_type!.toLowerCase()));
      if (matchedPm) setPaymentMethodId(matchedPm.id);
    }
    if (scanPreview.purchase_type) {
      const matched = getCategoryById(scanPreview.purchase_type);
      if (matched) {
        setPurchaseType(matched.id);
        setVatIncluded(matched.includesTax);
      }
    }
    if (scanPreview.date) setDate(scanPreview.date);
    setScanConfirmOpen(false);
    setScanPreview(null);
    toast({ title: 'Invoice data applied to form' });
  };

  // Settings inline add
  const [newSeller, setNewSeller] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [s, a, p, emp, e, t] = await Promise.all([
      supabase.from('expense_sellers').select('id, name').order('name'),
      supabase.from('expense_accounts').select('id, name').order('name'),
      supabase.from('expense_payment_methods').select('id, name').order('name'),
      supabase.from('employees').select('id, name').order('name'),
      (supabase as any).from('daily_expenses')
        .select('*, expense_sellers(name), expense_accounts(name), expense_payment_methods(name), employees(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200),
      (supabase as any).from('expense_templates').select('*').order('position'),
    ]);
    setSellers(s.data || []);
    setAccounts(a.data || []);
    setPaymentMethods(p.data || []);
    setEmployees(emp.data || []);
    setExpenses((e.data as any[]) || []);
    setTemplates((t.data as ExpenseTemplate[]) || []);
    setIsLoading(false);
  };

  const applyTemplate = (tpl: ExpenseTemplate) => {
    setTitle(tpl.name);
    if (tpl.seller_id) setSellerId(tpl.seller_id);
    if (tpl.account_id) setAccountId(tpl.account_id);
    if (tpl.payment_method_id) setPaymentMethodId(tpl.payment_method_id);
    if (tpl.default_amount) setAmount(String(tpl.default_amount));
    setVatIncluded(tpl.vat_included);
    if (tpl.notes) setNotes(tpl.notes);
    toast({ title: `Template "${tpl.name}" applied` });
  };

  const sendTemplateToAgent = async (tpl: ExpenseTemplate) => {
    if (!tpl.webhook_prompt_template) {
      toast({ title: 'No prompt template configured', variant: 'destructive' });
      return;
    }
    setSendingWebhook(tpl.id);
    try {
      const sellerName = sellers.find(s => s.id === tpl.seller_id)?.name || '';
      const accountName = accounts.find(a => a.id === tpl.account_id)?.name || '';
      const prompt = tpl.webhook_prompt_template
        .replace('{seller}', sellerName)
        .replace('{account}', accountName)
        .replace('{amount}', String(tpl.default_amount || 0))
        .replace('{name}', tpl.name)
        .replace('{date}', format(new Date(), 'yyyy-MM-dd'))
        .replace('{notes}', tpl.notes || '');

      const { data, error } = await supabase.functions.invoke('send-expense-webhook', {
        body: { prompt },
      });

      if (error) throw error;

      if (data?.response) {
        const agentResponse = typeof data.response === 'string'
          ? data.response
          : JSON.stringify(data.response, null, 2);
        toast({ title: 'Agent Response', description: agentResponse });
      } else {
        toast({ title: 'Sent to agent successfully' });
      }
    } catch (err: any) {
      toast({ title: 'Failed to send to agent', description: err.message, variant: 'destructive' });
    } finally {
      setSendingWebhook(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !purchaseType) {
      toast({ title: 'Please fill title, purchase type, and amount', variant: 'destructive' });
      return;
    }
    // Auto-resolve account from purchase type
    const category = getCategoryById(purchaseType);
    const resolvedAccountId = accountId || null;
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from('daily_expenses').insert({
        title: title.trim(),
        seller_id: null,
        account_id: resolvedAccountId,
        payment_method_id: paymentMethodId || null,
        employee_id: employeeId || null,
        invoice_number: invoiceNumber || null,
        amount: parseFloat(amount),
        vat_included: category ? category.includesTax : vatIncluded,
        date,
        notes: notes ? `[${purchaseType}] ${notes}` : `[${purchaseType}]`,
        created_by: user?.id,
        status: 'submitted',
      });
      if (error) throw error;

      setTitle(''); setPurchaseType(''); setAccountId(''); setEmployeeId('');
      setInvoiceNumber(''); setAmount(''); setNotes('');
      toast({ title: 'Expense submitted (awaiting approval)' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approval workflow
  const handleApprove = async (exp: Expense) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(exp.id));
    try {
      const { error } = await (supabase as any)
        .from('daily_expenses')
        .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', exp.id);
      if (error) throw error;

      // Send to unified webhook
      const sellerName = exp.expense_sellers?.name || '';
      const accountName = exp.expense_accounts?.name || '';
      const employeeName = exp.employees?.name || '';
      const paymentName = exp.expense_payment_methods?.name || '';

      // Extract purchase type from notes if stored
      const purchaseTypeMatch = exp.notes?.match(/^\[([^\]]+)\]/);
      const purchaseTypeId = purchaseTypeMatch?.[1] || '';
      const zohoPayload = buildZohoPayload({
        vendor: sellerName,
        invoiceNumber: exp.invoice_number || '',
        amount: exp.amount,
        date: exp.date,
        purchaseType: purchaseTypeId,
        paymentMethodName: paymentName,
        includesTax: exp.vat_included,
      });

      const webhookPayload = {
        type: 'expense',
        entry_id: exp.id,
        title: exp.title || '',
        seller: sellerName,
        account: accountName,
        payment_method: paymentName,
        employee: employeeName,
        amount: exp.amount,
        vat_included: exp.vat_included,
        date: exp.date,
        invoice_number: exp.invoice_number || '',
        notes: exp.notes || '',
        zoho: zohoPayload,
        prompt: `سجل مصروف "${exp.title || ''}" من ${sellerName} بمبلغ ${exp.amount} ريال (${exp.vat_included ? 'شامل الضريبة' : 'غير شامل'}) في حساب ${zohoPayload.expense_account_name || accountName} بطريقة دفع ${zohoPayload.payment_account_name || paymentName} بواسطة ${employeeName} بتاريخ ${exp.date}${exp.notes ? ` ملاحظات: ${exp.notes}` : ''}${exp.invoice_number ? ` رقم الفاتورة: ${exp.invoice_number}` : ''}`,
      };

      const { data: webhookResult } = await supabase.functions.invoke('send-to-webhook', {
        body: webhookPayload,
      });

      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() } : e));

      if (webhookResult?.response) {
        const agentResponse = typeof webhookResult.response === 'string'
          ? webhookResult.response
          : JSON.stringify(webhookResult.response, null, 2);
        toast({ title: 'Expense approved', description: agentResponse });
      } else {
        toast({ title: 'Expense approved & sent to agent' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(exp.id); return n; });
    }
  };

  const handleReject = async (exp: Expense) => {
    setProcessingIds(prev => new Set(prev).add(exp.id));
    try {
      const { error } = await (supabase as any)
        .from('daily_expenses')
        .update({ status: 'rejected' })
        .eq('id', exp.id);
      if (error) throw error;

      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'rejected' } : e));
      toast({ title: 'Expense rejected & archived' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(exp.id); return n; });
    }
  };

  const handleRestore = async (exp: Expense) => {
    setProcessingIds(prev => new Set(prev).add(exp.id));
    try {
      const { error } = await (supabase as any)
        .from('daily_expenses')
        .update({ status: 'submitted' })
        .eq('id', exp.id);
      if (error) throw error;

      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'submitted' } : e));
      toast({ title: 'Expense restored to submitted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(exp.id); return n; });
    }
  };

  const handleRevoke = async (exp: Expense) => {
    setProcessingIds(prev => new Set(prev).add(exp.id));
    try {
      const { error } = await (supabase as any)
        .from('daily_expenses')
        .update({ status: 'submitted', approved_by: null, approved_at: null })
        .eq('id', exp.id);
      if (error) throw error;

      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'submitted', approved_by: null, approved_at: null } : e));
      toast({ title: 'Approval revoked — expense is submitted again' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(exp.id); return n; });
    }
  };

  const handleResendWebhook = async (exp: Expense) => {
    setProcessingIds(prev => new Set(prev).add(exp.id));
    try {
      const sellerName = exp.expense_sellers?.name || '';
      const accountName = exp.expense_accounts?.name || '';
      const employeeName = exp.employees?.name || '';
      const paymentName = exp.expense_payment_methods?.name || '';

      const purchaseTypeMatch = exp.notes?.match(/^\[([^\]]+)\]/);
      const purchaseTypeId = purchaseTypeMatch?.[1] || '';
      const zohoPayload = buildZohoPayload({
        vendor: sellerName,
        invoiceNumber: exp.invoice_number || '',
        amount: exp.amount,
        date: exp.date,
        purchaseType: purchaseTypeId,
        paymentMethodName: paymentName,
        includesTax: exp.vat_included,
      });

      const webhookPayload = {
        type: 'expense',
        entry_id: exp.id,
        title: exp.title || '',
        seller: sellerName,
        account: accountName,
        payment_method: paymentName,
        employee: employeeName,
        amount: exp.amount,
        vat_included: exp.vat_included,
        date: exp.date,
        invoice_number: exp.invoice_number || '',
        notes: exp.notes || '',
        zoho: zohoPayload,
        prompt: `سجل مصروف "${exp.title || ''}" من ${sellerName} بمبلغ ${exp.amount} ريال (${exp.vat_included ? 'شامل الضريبة' : 'غير شامل'}) في حساب ${zohoPayload.expense_account_name || accountName} بطريقة دفع ${zohoPayload.payment_account_name || paymentName} بواسطة ${employeeName} بتاريخ ${exp.date}${exp.notes ? ` ملاحظات: ${exp.notes}` : ''}${exp.invoice_number ? ` رقم الفاتورة: ${exp.invoice_number}` : ''}`,
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
      setProcessingIds(prev => { const n = new Set(prev); n.delete(exp.id); return n; });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await (supabase as any).from('daily_expenses').update({ status: 'rejected' }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' } : e));
      toast({ title: 'Expense archived' });
    }
  };

  // Template management
  const addTemplate = async () => {
    if (!tplName.trim()) return;
    const { error } = await (supabase as any).from('expense_templates').insert({
      name: tplName.trim(),
      seller_id: tplSellerId || null,
      account_id: tplAccountId || null,
      payment_method_id: tplPaymentMethodId || null,
      default_amount: tplDefaultAmount ? parseFloat(tplDefaultAmount) : 0,
      vat_included: tplVatIncluded,
      notes: tplNotes || null,
      webhook_prompt_template: tplPrompt || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setTplName(''); setTplSellerId(''); setTplAccountId(''); setTplPaymentMethodId('');
    setTplDefaultAmount(''); setTplVatIncluded(true); setTplNotes(''); setTplPrompt('');
    toast({ title: 'Template saved' });
    const { data } = await (supabase as any).from('expense_templates').select('*').order('position');
    setTemplates(data || []);
  };

  const deleteTemplate = async (id: string) => {
    await (supabase as any).from('expense_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
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

  // Computed
  const activeExpenses = useMemo(() => expenses.filter(e => e.status !== 'rejected'), [expenses]);
  const archivedExpenses = useMemo(() => expenses.filter(e => e.status === 'rejected'), [expenses]);
  const displayedExpenses = showArchive ? archivedExpenses : activeExpenses;

  // Employee's own recent entries (last 5 submitted, editable)
  const myRecentEntries = useMemo(() => {
    if (!user) return [];
    return expenses
      .filter(e => e.created_by === user.id && e.status === 'submitted')
      .slice(0, 5);
  }, [expenses, user]);

  const startEditing = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditTitle(exp.title || '');
    setEditAmount(String(exp.amount));
    setEditInvoiceNumber(exp.invoice_number || '');
    setEditSellerId(exp.seller_id || '');
    const ptMatch = exp.notes?.match(/^\[([^\]]+)\]/);
    setEditPurchaseType(ptMatch?.[1] || '');
    setEditPaymentMethodId(exp.payment_method_id || '');
    setEditNotes(exp.notes?.replace(/^\[[^\]]+\]\s*/, '') || '');
  };

  const saveEdit = async () => {
    if (!editingExpenseId || !editAmount) return;
    try {
      const category = getCategoryById(editPurchaseType);
      const { error } = await (supabase as any).from('daily_expenses').update({
        title: editTitle || (category?.label || null),
        amount: parseFloat(editAmount),
        invoice_number: editInvoiceNumber || null,
        seller_id: editSellerId || null,
        payment_method_id: editPaymentMethodId || null,
        vat_included: category ? category.includesTax : true,
        notes: editNotes ? `[${editPurchaseType}] ${editNotes}` : editPurchaseType ? `[${editPurchaseType}]` : null,
      }).eq('id', editingExpenseId);
      if (error) throw error;
      setEditingExpenseId(null);
      toast({ title: 'Expense updated' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const todayTotal = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return expenses
      .filter(e => e.date === today && e.status !== 'rejected')
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
      <div className="p-6 max-w-full">
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

        {/* Quick Templates */}
        {templates.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => applyTemplate(tpl)}>
                    <Zap className="w-3 h-3 text-primary" />
                    {tpl.name}
                  </Button>
                  {isAdmin && tpl.webhook_prompt_template && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" disabled={sendingWebhook === tpl.id} onClick={() => sendTemplateToAgent(tpl)} title="Send to accountant agent">
                      {sendingWebhook === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="card-premium p-5 mb-6">
           <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Add Expense
            </h3>
            <InvoiceScanner
              onScanned={(data) => {
                setScanPreview(data);
                setScanConfirmOpen(true);
              }}
              variant="prominent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Zadi Dhabi daily purchase" className="h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> Purchase Type *</Label>
              <Select value={purchaseType} onValueChange={(val) => {
                if (val === '__add_new__') {
                  setAddingPurchaseType(true);
                  return;
                }
                setPurchaseType(val);
                const cat = getCategoryById(val);
                if (cat) setVatIncluded(cat.includesTax);
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="What was purchased?" /></SelectTrigger>
                <SelectContent>
                  {PURCHASE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label} — {cat.labelAr}
                    </SelectItem>
                  ))}
                  {customPurchaseTypes.map(cpt => (
                    <SelectItem key={cpt} value={cpt}>{cpt}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-primary font-medium">
                    + Add New Type...
                  </SelectItem>
                </SelectContent>
              </Select>
              {addingPurchaseType && (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newPurchaseTypeName}
                    onChange={e => setNewPurchaseTypeName(e.target.value)}
                    placeholder="New type name..."
                    className="h-8 text-xs"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPurchaseTypeName.trim()) {
                          setCustomPurchaseTypes(prev => [...prev, newPurchaseTypeName.trim()]);
                          setPurchaseType(newPurchaseTypeName.trim());
                          setNewPurchaseTypeName('');
                          setAddingPurchaseType(false);
                        }
                      }
                      if (e.key === 'Escape') { setAddingPurchaseType(false); setNewPurchaseTypeName(''); }
                    }}
                  />
                  <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                    if (newPurchaseTypeName.trim()) {
                      setCustomPurchaseTypes(prev => [...prev, newPurchaseTypeName.trim()]);
                      setPurchaseType(newPurchaseTypeName.trim());
                      setNewPurchaseTypeName('');
                      setAddingPurchaseType(false);
                    }
                  }}>Add</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setAddingPurchaseType(false); setNewPurchaseTypeName(''); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Purchased By</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2 pt-5">
              <div className="flex items-center gap-2">
                <Checkbox checked={vatIncluded} onCheckedChange={(v) => setVatIncluded(v === true)} id="vat" />
                <Label htmlFor="vat" className="text-sm cursor-pointer">VAT Included (15%)</Label>
              </div>
              {vatIncluded && amount && parseFloat(amount) > 0 && (() => {
                const total = parseFloat(amount);
                const net = total / 1.15;
                const vat = total - net;
                return (
                  <div className="bg-muted/50 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Net Amount</span><span>﷼{net.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">VAT (15%)</span><span>﷼{vat.toFixed(2)}</span></div>
                    <div className="flex justify-between font-medium"><span className="text-muted-foreground">Total</span><span>﷼{total.toFixed(2)}</span></div>
                  </div>
                );
              })()}
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

        {/* My Recent Entries (employees can edit their submitted entries) */}
        {myRecentEntries.length > 0 && (
          <div className="card-premium p-5 mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Pencil className="w-4 h-4 text-primary" />
              My Recent Entries
            </h3>
            <div className="space-y-2">
              {myRecentEntries.map(exp => (
                <div key={exp.id} className="rounded-lg border border-border p-3">
                  {editingExpenseId === exp.id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="h-8 text-sm" />
                      <Select value={editSellerId} onValueChange={setEditSellerId}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seller" /></SelectTrigger>
                        <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={editPurchaseType} onValueChange={setEditPurchaseType}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Purchase Type" /></SelectTrigger>
                        <SelectContent>
                          {PURCHASE_CATEGORIES.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label} — {cat.labelAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={editInvoiceNumber} onChange={e => setEditInvoiceNumber(e.target.value)} placeholder="Invoice #" className="h-8 text-sm" />
                      <Input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Amount" className="h-8 text-sm" />
                      <Select value={editPaymentMethodId} onValueChange={setEditPaymentMethodId}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Payment" /></SelectTrigger>
                        <SelectContent>{paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                        <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" className="h-8 text-sm flex-1" />
                        <Button size="sm" className="h-8 gap-1" onClick={saveEdit}>
                          <Save className="w-3 h-3" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingExpenseId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm min-w-0">
                        <span className="text-muted-foreground">{format(new Date(exp.date), 'MMM dd')}</span>
                        <span className="font-medium truncate">{exp.title || '—'}</span>
                        <span className="text-muted-foreground">{exp.expense_sellers?.name || ''}</span>
                        <span className="font-semibold">﷼{Number(exp.amount).toLocaleString()}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => startEditing(exp)}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dual View: Table + Bot Register */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses Table */}
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">
                {showArchive ? 'Archived (Rejected)' : 'Expenses'} ({displayedExpenses.length})
              </h3>
              <Button
                variant={showArchive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowArchive(!showArchive)}
              >
                <Archive className="w-3.5 h-3.5" />
                {showArchive ? 'Back to Active' : `Archive (${archivedExpenses.length})`}
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Seller</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedExpenses.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses found</td></tr>
                  ) : (
                    displayedExpenses.map(exp => (
                      <tr
                        key={exp.id}
                        className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${selectedExpense?.id === exp.id ? 'bg-primary/5' : ''}`}
                        onClick={() => setSelectedExpense(exp)}
                      >
                        <td className="p-3">{format(new Date(exp.date), 'MMM dd')}</td>
                        <td className="p-3 font-medium text-foreground max-w-[150px] truncate">{exp.title || '—'}</td>
                        <td className="p-3 text-muted-foreground">{exp.expense_sellers?.name || '—'}</td>
                        <td className="p-3 text-right">
                          <div className="font-semibold">﷼{Number(exp.amount).toLocaleString()}</div>
                          {exp.vat_included && (() => {
                            const net = Number(exp.amount) / 1.15;
                            const vat = Number(exp.amount) - net;
                            return <div className="text-xs text-muted-foreground">Net: ﷼{net.toFixed(0)} | VAT: ﷼{vat.toFixed(0)}</div>;
                          })()}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                            exp.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : exp.status === 'rejected'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {exp.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                             exp.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {exp.status === 'approved' ? 'Approved' : exp.status === 'rejected' ? 'Rejected' : 'Submitted'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {showArchive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={processingIds.has(exp.id)}
                              onClick={(e) => { e.stopPropagation(); handleRestore(exp); }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </Button>
                          ) : exp.status === 'submitted' && isAdmin ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                disabled={processingIds.has(exp.id)}
                                onClick={(e) => { e.stopPropagation(); handleApprove(exp); }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={processingIds.has(exp.id)}
                                onClick={(e) => { e.stopPropagation(); handleReject(exp); }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : exp.status === 'approved' && isAdmin ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResendWebhook(exp); }} disabled={processingIds.has(exp.id)}>
                                  <Send className="w-3.5 h-3.5 mr-2" />
                                  Resend to Webhook
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRevoke(exp); }} disabled={processingIds.has(exp.id)} className="text-amber-600 focus:text-amber-600">
                                  <Undo2 className="w-3.5 h-3.5 mr-2" />
                                  Revoke Approval
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReject(exp); }} disabled={processingIds.has(exp.id)} className="text-destructive focus:text-destructive">
                                  <XCircle className="w-3.5 h-3.5 mr-2" />
                                  Reject & Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : exp.status === 'submitted' ? (
                            <span className="text-xs text-muted-foreground">Awaiting</span>
                          ) : null}
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
            <ExpenseBotRegister entry={selectedExpense} />
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Expense Options</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="templates" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="templates" className="flex-1 gap-1"><FileText className="w-3.5 h-3.5" /> Templates</TabsTrigger>
              <TabsTrigger value="sellers" className="flex-1 gap-1"><Store className="w-3.5 h-3.5" /> Sellers</TabsTrigger>
              <TabsTrigger value="accounts" className="flex-1 gap-1"><Wallet className="w-3.5 h-3.5" /> Accounts</TabsTrigger>
              <TabsTrigger value="methods" className="flex-1 gap-1"><CreditCard className="w-3.5 h-3.5" /> Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-3 mt-3">
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Template name (e.g. Zadi Dhabi)" className="h-9" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={tplSellerId} onValueChange={setTplSellerId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seller" /></SelectTrigger>
                    <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={tplAccountId} onValueChange={setTplAccountId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Account" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={tplPaymentMethodId} onValueChange={setTplPaymentMethodId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Payment" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" step="0.01" value={tplDefaultAmount} onChange={e => setTplDefaultAmount(e.target.value)} placeholder="Default amount" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Agent Prompt Template (placeholders: {'{name}'}, {'{seller}'}, {'{account}'}, {'{amount}'}, {'{date}'}, {'{notes}'})</Label>
                  <Textarea
                    value={tplPrompt}
                    onChange={e => setTplPrompt(e.target.value)}
                    placeholder="e.g. سجل مصروف {name} من {seller} بمبلغ {amount} في حساب {account} بتاريخ {date}"
                    className="mt-1 text-sm"
                    rows={3}
                  />
                </div>
                <Button size="sm" className="w-full gap-1" onClick={addTemplate}>
                  <Plus className="w-4 h-4" /> Add Template
                </Button>
              </div>
              <div className="space-y-1">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{t.name}</span>
                      {t.webhook_prompt_template && <span className="ml-2 text-xs text-primary">⚡ Agent</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No templates yet</p>}
              </div>
            </TabsContent>

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

      {/* Scan Confirmation Dialog */}
      <Dialog open={scanConfirmOpen} onOpenChange={setScanConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Scan Results
            </DialogTitle>
          </DialogHeader>
          {scanPreview && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the extracted data below. Click "Apply" to fill the form or "Discard" to enter manually.
              </p>
              <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                {scanPreview.vendor_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vendor</span>
                    <span className="font-medium">{scanPreview.vendor_name}</span>
                  </div>
                )}
                {scanPreview.invoice_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invoice #</span>
                    <span className="font-medium">{scanPreview.invoice_number}</span>
                  </div>
                )}
                {scanPreview.amount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">﷼{scanPreview.amount.toLocaleString()}</span>
                  </div>
                )}
                {scanPreview.vat_amount != null && scanPreview.vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="font-medium">﷼{scanPreview.vat_amount.toLocaleString()}</span>
                  </div>
                )}
                {scanPreview.payment_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-medium">{scanPreview.payment_type}</span>
                  </div>
                )}
                {scanPreview.purchase_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{getCategoryById(scanPreview.purchase_type)?.label || scanPreview.purchase_type} — {getCategoryById(scanPreview.purchase_type)?.labelAr || ''}</span>
                  </div>
                )}
                {scanPreview.date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{scanPreview.date}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setScanConfirmOpen(false); setScanPreview(null); }}>
                  Discard
                </Button>
                <Button onClick={applyScanData}>
                  Apply to Form
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
