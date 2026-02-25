import { useState, useEffect } from 'react';
import { Check, Circle, Clock } from 'lucide-react';
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

      const allDuties = (dutiesRes.data || []).filter(d => {
        const dutyAssignments = allAssignments.filter(a => a.duty_id === d.id);
        
        if (dutyAssignments.length > 0) {
          const isAssigned = dutyAssignments.some(a => a.employee_id === employeeId);
          if (!isAssigned) return false;
        } else {
          const roleMatch = !d.role || d.role === employeeRole || d.role === '';
          if (!roleMatch) return false;
        }
        
        if (d.is_recurring) return true;
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

  const regularDuties = duties.filter(d => !d.is_end_of_day);
  const endOfDayDuties = duties.filter(d => d.is_end_of_day);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading checklist...</div>;
  }

  const renderDutyItem = (duty: Duty, category?: DutyCategory) => {
    const isCompleted = completedDutyIds.has(duty.id);
    const categoryColor = category?.color || '#6B7280';

    return (
      <div
        key={duty.id}
        className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
          isCompleted
            ? 'bg-muted/40 border-border/30'
            : 'bg-card border-border/50 hover:border-border hover:shadow-sm'
        }`}
      >
        {/* Category color bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Check button */}
        <button
          onClick={() => toggleDuty(duty.id)}
          className={`ml-2 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            isCompleted
              ? 'border-transparent text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-muted-foreground/60'
          }`}
          style={isCompleted ? { backgroundColor: categoryColor } : {}}
        >
          {isCompleted ? (
            <Check className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground/40" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {duty.title}
            </p>
            {!duty.is_recurring && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">One-time</Badge>
            )}
          </div>
          {duty.description && (
            <p className={`text-xs mt-0.5 ${isCompleted ? 'line-through text-muted-foreground/50' : 'text-muted-foreground'}`}>
              {duty.description}
            </p>
          )}
        </div>

        {/* Category badge */}
        {category && (
          <span
            className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${categoryColor}18`,
              color: categoryColor,
              border: `1px solid ${categoryColor}30`,
            }}
          >
            {category.name}
          </span>
        )}
      </div>
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
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
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
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {catDuties.filter(d => completedDutyIds.has(d.id)).length}/{catDuties.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {catDuties.map(d => renderDutyItem(d, cat))}
                </div>
              </div>
            );
          })}

          {/* End-of-Day section */}
          {endOfDayDuties.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Anytime Today</h3>
                <Badge variant="outline" className="text-xs">End of Day</Badge>
              </div>
              <div className="space-y-2">
                {endOfDayDuties.map(d => {
                  const cat = categories.find(c => c.id === d.category_id);
                  return renderDutyItem(d, cat);
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
