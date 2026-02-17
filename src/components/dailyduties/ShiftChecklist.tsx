import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Duty {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  role: string | null;
  position: number;
  is_end_of_day: boolean;
  is_recurring: boolean;
  target_date: string | null;
}

interface DutyCategory {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface ShiftChecklistProps {
  employeeId: string;
  employeeName: string;
  employeeRole: string | null;
  onClose: () => void;
}

export function ShiftChecklist({ employeeId, employeeName, employeeRole, onClose }: ShiftChecklistProps) {
  const [categories, setCategories] = useState<DutyCategory[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [completedDutyIds, setCompletedDutyIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchChecklist();
  }, []);

  const fetchChecklist = async () => {
    try {
      const [categoriesRes, dutiesRes, completionsRes, assignmentsRes] = await Promise.all([
        supabase.from('duty_categories').select('*').order('position'),
        supabase.from('duties').select('*').order('position'),
        supabase.from('duty_completions')
          .select('duty_id')
          .eq('employee_id', employeeId)
          .gte('completed_at', `${today}T00:00:00`)
          .lte('completed_at', `${today}T23:59:59`),
        supabase.from('duty_employee_assignments').select('duty_id, employee_id'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (dutiesRes.error) throw dutiesRes.error;

      const allAssignments = assignmentsRes.data || [];

      // Filter duties: 
      // 1. If duty has specific employee assignments, only show if this employee is assigned
      // 2. If duty has no assignments, fall back to role matching (or show to all if no role set)
      const allDuties = (dutiesRes.data || []).filter(d => {
        const dutyAssignments = allAssignments.filter(a => a.duty_id === d.id);
        
        if (dutyAssignments.length > 0) {
          // Duty has specific assignments - only show to assigned employees
          const isAssigned = dutyAssignments.some(a => a.employee_id === employeeId);
          if (!isAssigned) return false;
        } else {
          // No specific assignments - fall back to role matching
          const roleMatch = !d.role || d.role === employeeRole || d.role === '';
          if (!roleMatch) return false;
        }
        
        if (d.is_recurring) return true;
        // One-off: only show if target_date is today
        return d.target_date === today;
      });

      setCategories(categoriesRes.data || []);
      setDuties(allDuties);
      setCompletedDutyIds(new Set((completionsRes.data || []).map(c => c.duty_id)));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDuty = async (dutyId: string) => {
    const isCompleted = completedDutyIds.has(dutyId);

    if (isCompleted) {
      // Uncomplete: delete today's completion
      try {
        const { error } = await supabase
          .from('duty_completions')
          .delete()
          .eq('duty_id', dutyId)
          .eq('employee_id', employeeId)
          .gte('completed_at', `${today}T00:00:00`)
          .lte('completed_at', `${today}T23:59:59`);
        if (error) throw error;
        setCompletedDutyIds(prev => {
          const next = new Set(prev);
          next.delete(dutyId);
          return next;
        });
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      // Complete
      try {
        const { error } = await supabase
          .from('duty_completions')
          .insert({ duty_id: dutyId, employee_id: employeeId, rating: 5 });
        if (error) throw error;
        setCompletedDutyIds(prev => new Set(prev).add(dutyId));
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const totalDuties = duties.length;
  const completedCount = duties.filter(d => completedDutyIds.has(d.id)).length;
  const progress = totalDuties > 0 ? (completedCount / totalDuties) * 100 : 0;

  // Split duties: regular first, end-of-day last
  const regularDuties = duties.filter(d => !d.is_end_of_day);
  const endOfDayDuties = duties.filter(d => d.is_end_of_day);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading checklist...</div>;
  }

  const renderDutyItem = (duty: Duty, category?: DutyCategory) => {
    const isCompleted = completedDutyIds.has(duty.id);
    return (
      <button
        key={duty.id}
        onClick={() => toggleDuty(duty.id)}
        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
          isCompleted
            ? 'bg-muted/30 opacity-60'
            : 'hover:bg-muted/20'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            <span className="text-muted-foreground text-sm mr-2">#{duty.position + 1}</span>
            {duty.title}
          </p>
          {duty.description && (
            <p className={`text-sm mt-0.5 ${isCompleted ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'}`}>
              {duty.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {category && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${category.color}15`, color: category.color }}>
                {category.name}
              </span>
            )}
            {!duty.is_recurring && (
              <Badge variant="outline" className="text-xs">One-time</Badge>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-semibold text-primary">{employeeName.charAt(0).toUpperCase()}</span>
        </div>
        <h2 className="text-lg font-semibold">{employeeName}'s Checklist</h2>
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        {employeeRole && <Badge variant="secondary" className="mt-1">{employeeRole}</Badge>}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedCount}/{totalDuties} done</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {totalDuties === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No duties assigned for your role today.</p>
        </div>
      ) : (
        <>
          {/* Regular duties by category */}
          {categories.map(cat => {
            const catDuties = regularDuties.filter(d => d.category_id === cat.id);
            if (catDuties.length === 0) return null;
            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                </div>
                {catDuties.map(d => renderDutyItem(d, cat))}
              </div>
            );
          })}

          {/* End-of-Day section */}
          {endOfDayDuties.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Anytime Today</h3>
                <Badge variant="outline" className="text-xs">End of Day</Badge>
              </div>
              {endOfDayDuties.map(d => {
                const cat = categories.find(c => c.id === d.category_id);
                return renderDutyItem(d, cat);
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
