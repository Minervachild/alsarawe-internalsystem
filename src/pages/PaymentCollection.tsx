import { useState, useEffect, useMemo } from 'react';
import { Plus, Upload, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isPast } from 'date-fns';

interface PaymentCollection {
  id: string;
  client_name: string;
  items: any[];
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  invoice_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function PaymentCollection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [collections, setCollections] = useState<PaymentCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PaymentCollection | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    const { data, error } = await (supabase as any)
      .from('payment_collections')
      .select('*')
      .order('due_date', { ascending: true });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCollections(data || []);
    }
    setIsLoading(false);
  };

  const handleScanInvoice = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({ title: 'Please upload an image or PDF', variant: 'destructive' });
      return;
    }

    setScanning(true);
    try {
      if (file.type.startsWith('image/')) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const { data, error } = await supabase.functions.invoke('scan-invoice', {
          body: { image_base64: base64, mime_type: file.type },
        });

        if (error) throw error;
        if (data?.success && data?.data) {
          const d = data.data;
          if (d.vendor_name) setClientName(d.vendor_name);
          if (d.amount) setTotalAmount(String(d.amount));
          if (d.date) setDueDate(d.date);
          toast({ title: 'Invoice scanned — data extracted' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !totalAmount) {
      toast({ title: 'Client name and total amount required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let invoicePath: string | null = null;

      if (invoiceFile) {
        const ext = invoiceFile.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('payment-invoices')
          .upload(path, invoiceFile);
        if (uploadErr) throw uploadErr;
        invoicePath = path;
      }

      const items = itemsText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => ({ name: line }));

      const { error } = await (supabase as any).from('payment_collections').insert({
        client_name: clientName,
        items,
        total_amount: parseFloat(totalAmount),
        due_date: dueDate || null,
        invoice_url: invoicePath,
        notes: notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      setClientName(''); setItemsText(''); setTotalAmount('');
      setDueDate(''); setNotes(''); setInvoiceFile(null);
      setAddOpen(false);
      toast({ title: 'Collection added' });
      fetchCollections();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payTarget || !payAmount) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newPaid = (payTarget.paid_amount || 0) + amt;
    const fullyPaid = newPaid >= payTarget.total_amount;

    const { error } = await (supabase as any)
      .from('payment_collections')
      .update({
        paid_amount: newPaid,
        status: fullyPaid ? 'paid' : 'partial',
      })
      .eq('id', payTarget.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: fullyPaid ? 'Fully paid!' : 'Payment recorded' });
      setPayOpen(false);
      setPayTarget(null);
      setPayAmount('');
      fetchCollections();
    }
  };

  const viewInvoice = async (path: string) => {
    const { data } = await supabase.storage
      .from('payment-invoices')
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setInvoicePreview(data.signedUrl);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(c =>
      c.client_name.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q)
    );
  }, [collections, searchQuery]);

  const stats = useMemo(() => {
    const totalOwed = collections.reduce((s, c) => s + (c.total_amount - c.paid_amount), 0);
    const overdue = collections.filter(c => c.due_date && isPast(new Date(c.due_date)) && c.status !== 'paid').length;
    const pending = collections.filter(c => c.status !== 'paid').length;
    return { totalOwed, overdue, pending };
  }, [collections]);

  const getStatusInfo = (c: PaymentCollection) => {
    if (c.status === 'paid') return { label: 'Paid', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle };
    if (c.due_date && isPast(new Date(c.due_date))) return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle };
    if (c.status === 'partial') return { label: 'Partial', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock };
    return { label: 'Pending', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock };
  };

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
      <div className="p-4 sm:p-6 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Payment Collection</h1>
            <p className="text-muted-foreground">Track invoices and client payments</p>
          </div>
          <Button className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card-premium p-4">
            <p className="text-xs text-muted-foreground">Total Owed</p>
            <p className="text-xl font-semibold mt-1">﷼{stats.totalOwed.toLocaleString()}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-xl font-semibold mt-1 text-destructive">{stats.overdue}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold mt-1">{stats.pending}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Collection Cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No payment collections yet. Add your first invoice to get started.
            </div>
          ) : (
            filtered.map((c) => {
              const statusInfo = getStatusInfo(c);
              const remaining = c.total_amount - c.paid_amount;
              const daysUntilDue = c.due_date ? differenceInDays(new Date(c.due_date), new Date()) : null;

              return (
                <div key={c.id} className="card-premium p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{c.client_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusInfo.color}`}>
                          <statusInfo.icon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                        {daysUntilDue !== null && c.status !== 'paid' && (
                          <span className={`text-xs ${daysUntilDue < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d left`}
                          </span>
                        )}
                      </div>

                      {/* Items */}
                      {Array.isArray(c.items) && c.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.items.map((item: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{item.name}</span>
                          ))}
                        </div>
                      )}

                      {/* Amounts */}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Total: <span className="font-medium text-foreground">﷼{c.total_amount.toLocaleString()}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Paid: <span className="font-medium text-emerald-600">﷼{c.paid_amount.toLocaleString()}</span>
                        </span>
                        {remaining > 0 && (
                          <span className="text-muted-foreground">
                            Remaining: <span className="font-medium text-destructive">﷼{remaining.toLocaleString()}</span>
                          </span>
                        )}
                      </div>

                      {c.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(c.due_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.invoice_url && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => viewInvoice(c.invoice_url!)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {c.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => { setPayTarget(c); setPayAmount(''); setPayOpen(true); }}
                        >
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Invoice Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Invoice for Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Upload & scan */}
            <div className="space-y-2">
              <Label>Invoice Image (optional - will auto-extract data)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setInvoiceFile(file);
                      handleScanInvoice(file);
                    }
                  }}
                  className="flex-1"
                />
                {scanning && <Loader2 className="w-5 h-5 animate-spin text-primary mt-2" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Items (one per line)</Label>
              <Textarea
                value={itemsText}
                onChange={e => setItemsText(e.target.value)}
                placeholder="Item 1&#10;Item 2"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total Amount *</Label>
                <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Collection
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 mt-2">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Client:</span> {payTarget.client_name}</p>
                <p><span className="text-muted-foreground">Total:</span> ﷼{payTarget.total_amount.toLocaleString()}</p>
                <p><span className="text-muted-foreground">Already Paid:</span> ﷼{payTarget.paid_amount.toLocaleString()}</p>
                <p className="font-medium"><span className="text-muted-foreground">Remaining:</span> ﷼{(payTarget.total_amount - payTarget.paid_amount).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={`Max ﷼${(payTarget.total_amount - payTarget.paid_amount).toLocaleString()}`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button onClick={handleRecordPayment}>Record</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={!!invoicePreview} onOpenChange={(o) => { if (!o) setInvoicePreview(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {invoicePreview && (
            <div className="mt-2">
              <img src={invoicePreview} alt="Invoice" className="w-full rounded-lg" />
              <div className="flex justify-end mt-3">
                <Button asChild variant="outline">
                  <a href={invoicePreview} target="_blank" rel="noopener noreferrer" download>
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
