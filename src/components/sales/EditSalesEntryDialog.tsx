import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Branch {
  id: string;
  name: string;
}

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  cash_amount: number;
  card_amount: number;
  transaction_count: number;
  status: string;
}

interface EditSalesEntryDialogProps {
  entry: SalesEntry | null;
  branches: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditSalesEntryDialog({
  entry,
  branches,
  open,
  onOpenChange,
  onUpdated,
}: EditSalesEntryDialogProps) {
  const [date, setDate] = useState(entry?.date || '');
  const [shift, setShift] = useState(entry?.shift || '');
  const [branchId, setBranchId] = useState(entry?.branch_id || '');
  const [cashAmount, setCashAmount] = useState(String(entry?.cash_amount || ''));
  const [cardAmount, setCardAmount] = useState(String(entry?.card_amount || ''));
  const [transactionCount, setTransactionCount] = useState(String(entry?.transaction_count || ''));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Sync state when entry changes
  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setShift(entry.shift);
      setBranchId(entry.branch_id);
      setCashAmount(String(entry.cash_amount));
      setCardAmount(String(entry.card_amount));
      setTransactionCount(String(entry.transaction_count));
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('sales_entries')
        .update({
          date,
          shift,
          branch_id: branchId,
          cash_amount: parseFloat(cashAmount),
          card_amount: parseFloat(cardAmount),
          transaction_count: parseInt(transactionCount),
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({ title: 'Sales entry updated' });
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Sales Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Cash Amount</Label>
              <Input type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Card Amount</Label>
              <Input type="number" min="0" step="0.01" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Transactions</Label>
            <Input type="number" min="1" step="1" value={transactionCount} onChange={(e) => setTransactionCount(e.target.value)} />
          </div>

          {cashAmount && cardAmount && (
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">﷼{(parseFloat(cashAmount || '0') + parseFloat(cardAmount || '0')).toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
