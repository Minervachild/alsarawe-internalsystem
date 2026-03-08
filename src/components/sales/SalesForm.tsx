import { useState, useEffect } from 'react';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
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

interface Branch {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface SalesFormProps {
  employeeId: string | null;
  onSuccess?: () => void;
}

export function SalesForm({ employeeId, onSuccess }: SalesFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('');
  const [branchId, setBranchId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [transactionCount, setTransactionCount] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchAllBranches();
      fetchAllEmployees();
    } else {
      fetchAssignedBranches();
    }
  }, [employeeId, isAdmin]);

  const fetchAllEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name');
    if (data) setEmployees(data);
  };

  const fetchAllBranches = async () => {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  };

  const fetchAssignedBranches = async () => {
    if (!employeeId) return;

    const { data } = await supabase
      .from('branch_assignments')
      .select('branch_id, branches(id, name)')
      .eq('employee_id', employeeId);

    if (data) {
      const assignedBranches = data
        .map((ba: any) => ba.branches)
        .filter(Boolean) as Branch[];
      setBranches(assignedBranches);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('sales-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setProofImageUrl(fileName);
      setProofFileName(file.name);
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const isFormValid = () => {
    const hasEmployee = isAdmin ? selectedEmployeeId : employeeId;
    return (
      date &&
      shift &&
      branchId &&
      cashAmount &&
      cardAmount &&
      transactionCount &&
      (proofImageUrl || isAdmin) &&
      hasEmployee
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || !user) return;

    const effectiveEmployeeId = isAdmin ? selectedEmployeeId : employeeId!;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('sales_entries').insert({
        date,
        shift,
        branch_id: branchId,
        employee_id: effectiveEmployeeId,
        submitted_by: user.id,
        cash_amount: parseFloat(cashAmount),
        card_amount: parseFloat(cardAmount),
        transaction_count: parseInt(transactionCount),
        proof_image_url: proofImageUrl || 'no-proof',
        ...(isAdmin ? { status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() } : {}),
      });

      if (error) throw error;

      // Fire-and-forget: no Telegram here, admin approves first

      setIsSubmitted(true);
      toast({ title: 'Sales submitted successfully! Pending admin approval.' });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Sales Submitted!</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Your sales data has been submitted successfully. It is now pending admin review.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setIsSubmitted(false);
            setDate(new Date().toISOString().split('T')[0]);
            setShift('');
            setBranchId('');
            setCashAmount('');
            setCardAmount('');
            setTransactionCount('');
            setSelectedEmployeeId('');
            setProofImageUrl(null);
            setProofFileName(null);
          }}
        >
          Submit Another
        </Button>
      </div>
    );
  }

  if (!employeeId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-center">
          Your account is not linked to an employee profile. Please contact an admin.
        </p>
      </div>
    );
  }

  if (branches.length === 0 && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-center">
          No branches assigned to you. Please contact an admin to assign you to a branch.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card-premium p-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Register Daily Sales</h2>
        <p className="text-sm text-muted-foreground mb-6">All fields are mandatory</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input-premium"
            />
          </div>

          {/* Shift */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Shift *</Label>
            <Select value={shift} onValueChange={setShift} required>
              <SelectTrigger className="input-premium">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Branch *</Label>
            <Select value={branchId} onValueChange={setBranchId} required>
              <SelectTrigger className="input-premium">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee (admin only) */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee *</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} required>
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cash Sales */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cash Sales Amount *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              required
              className="input-premium"
            />
          </div>

          {/* Card Sales */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Credit Card Sales Amount *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cardAmount}
              onChange={(e) => setCardAmount(e.target.value)}
              required
              className="input-premium"
            />
          </div>

          {/* Transaction Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Transactions *</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={transactionCount}
              onChange={(e) => setTransactionCount(e.target.value)}
              required
              className="input-premium"
            />
          </div>

          {/* Proof Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Proof Image (POS Report) {isAdmin ? '(optional)' : '*'}
            </Label>
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
              {proofFileName ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {proofFileName}
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploadingImage ? 'Uploading...' : isAdmin ? 'Click to upload proof image (optional)' : 'Click to upload proof image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Total Display */}
          {cashAmount && cardAmount && (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-semibold text-foreground">
                  ﷼{(parseFloat(cashAmount || '0') + parseFloat(cardAmount || '0')).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full btn-premium"
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Sales'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
