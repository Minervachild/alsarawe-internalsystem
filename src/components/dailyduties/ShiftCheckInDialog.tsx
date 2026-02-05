import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
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

interface Employee {
  id: string;
  name: string;
  shift_type: string | null;
  shift_start: string | null;
  shift_end: string | null;
}

interface ShiftCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ShiftCheckInDialog({ open, onOpenChange, onSuccess }: ShiftCheckInDialogProps) {
  const [step, setStep] = useState<'passcode' | 'shift'>('passcode');
  const [passcode, setPasscode] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'first' | 'second'>('first');
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setStep('passcode');
      setPasscode('');
      setEmployee(null);
      setExistingAttendance(null);
    }
  }, [open]);

  const verifyPasscode = async (code: string) => {
    if (code.length < 4) return;
    
    setIsLoading(true);
    try {
      // Use secure RPC function to verify passcode - prevents client-side data exposure
      const { data: rpcData, error } = await supabase
        .rpc('authenticate_with_passcode', { _passcode: code.toUpperCase() });

      if (error) throw error;
      if (!rpcData || rpcData.length === 0) {
        toast({ title: 'Invalid Passcode', description: 'Please try again.', variant: 'destructive' });
        setPasscode('');
        return;
      }

      const username = rpcData[0].username;

      // Find matching employee by name
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id, name, shift_type, shift_start, shift_end')
        .ilike('name', `%${username}%`)
        .maybeSingle();

      if (empError) throw empError;
      if (!emp) {
        toast({ title: 'No Employee Found', description: `No employee record found matching "${username}".`, variant: 'destructive' });
        setPasscode('');
        return;
      }

      setEmployee(emp);
      setShiftType((emp.shift_type as 'first' | 'second') || 'first');

      // Check existing attendance for today
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: attendance } = await supabase
        .from('shift_attendance')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .maybeSingle();

      if (attendance) {
        setExistingAttendance(attendance);
        setIsCheckingIn(!attendance.check_in_time || !!attendance.check_out_time);
        setShiftType(attendance.shift_type as 'first' | 'second');
      } else {
        setIsCheckingIn(true);
      }

      setStep('shift');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!employee) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const scheduledStart = employee.shift_start || '08:00';
      const scheduledEnd = employee.shift_end || '16:00';

      // Determine if on time (within 15 minutes of scheduled start)
      const [startHour, startMin] = scheduledStart.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(startHour, startMin, 0, 0);
      const isOnTime = now <= new Date(scheduledTime.getTime() + 15 * 60 * 1000);

      const { error } = await supabase
        .from('shift_attendance')
        .upsert({
          employee_id: employee.id,
          date: today,
          shift_type: shiftType,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          check_in_time: now.toISOString(),
          is_on_time: isOnTime,
        }, { onConflict: 'employee_id,date,shift_type' });

      if (error) throw error;

      toast({
        title: isOnTime ? 'Checked In On Time! ✓' : 'Checked In (Late)',
        description: `${employee.name} checked in at ${format(now, 'h:mm a')}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employee || !existingAttendance) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const { error } = await supabase
        .from('shift_attendance')
        .update({ check_out_time: now.toISOString() })
        .eq('id', existingAttendance.id);

      if (error) throw error;

      toast({
        title: 'Checked Out',
        description: `${employee.name} checked out at ${format(now, 'h:mm a')}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Shift Check-In
          </DialogTitle>
        </DialogHeader>

        {step === 'passcode' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">Enter your passcode to check in or out</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={passcode}
                  onChange={(value) => {
                    setPasscode(value.toUpperCase());
                    if (value.length >= 4) {
                      verifyPasscode(value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {isLoading && (
                <p className="text-sm text-muted-foreground mt-4">Verifying...</p>
              )}
            </div>
          </div>
        )}

        {step === 'shift' && employee && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-semibold text-primary">
                  {employee.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{employee.name}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {existingAttendance?.check_in_time && !existingAttendance?.check_out_time ? (
              <div className="card-premium p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-medium">Already Checked In</p>
                <p className="text-sm text-muted-foreground">
                  at {format(new Date(existingAttendance.check_in_time), 'h:mm a')}
                </p>
              </div>
            ) : existingAttendance?.check_out_time ? (
              <div className="card-premium p-4 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Shift Completed</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(existingAttendance.check_in_time), 'h:mm a')} - {format(new Date(existingAttendance.check_out_time), 'h:mm a')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Shift Type</Label>
                  <Select value={shiftType} onValueChange={(v) => setShiftType(v as 'first' | 'second')}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Shift (Morning)</SelectItem>
                      <SelectItem value="second">Second Shift (Evening)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="card-premium p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {employee.shift_start || '08:00'} - {employee.shift_end || '16:00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Current time:</span>
                    <span className="font-medium">{format(new Date(), 'h:mm a')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              {existingAttendance?.check_in_time && !existingAttendance?.check_out_time ? (
                <Button onClick={handleCheckOut} className="flex-1 rounded-xl" disabled={isLoading}>
                  Check Out
                </Button>
              ) : !existingAttendance?.check_out_time ? (
                <Button onClick={handleCheckIn} className="flex-1 rounded-xl" disabled={isLoading}>
                  Check In
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
