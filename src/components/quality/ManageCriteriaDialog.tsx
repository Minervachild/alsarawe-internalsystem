import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QualityItem } from './QualityItemCard';

interface Criteria {
  id: string;
  item_id: string;
  name: string;
  position: number;
}

interface ManageCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: QualityItem | null;
  onSuccess: () => void;
}

export function ManageCriteriaDialog({ open, onOpenChange, item, onSuccess }: ManageCriteriaDialogProps) {
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item) {
      fetchCriteria();
    }
  }, [open, item]);

  const fetchCriteria = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quality_criteria')
        .select('*')
        .eq('item_id', item.id)
        .order('position');
      if (error) throw error;
      setCriteria(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const addCriteria = async () => {
    if (!newCriteriaName.trim() || !item) return;
    try {
      const { data, error } = await supabase
        .from('quality_criteria')
        .insert({
          item_id: item.id,
          name: newCriteriaName.trim(),
          position: criteria.length,
        })
        .select()
        .single();
      if (error) throw error;
      setCriteria([...criteria, data]);
      setNewCriteriaName('');
      onSuccess();
      toast({ title: 'Criteria added' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteCriteria = async (id: string) => {
    try {
      const { error } = await supabase.from('quality_criteria').delete().eq('id', id);
      if (error) throw error;
      setCriteria(criteria.filter(c => c.id !== id));
      onSuccess();
      toast({ title: 'Criteria removed' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Review Criteria: {item?.name}</DialogTitle>
          <DialogDescription>Define what to evaluate during quality reviews</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Add new criteria */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Taste, Presentation, Speed..."
              value={newCriteriaName}
              onChange={(e) => setNewCriteriaName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriteria()}
              className="rounded-xl flex-1"
            />
            <Button onClick={addCriteria} disabled={!newCriteriaName.trim()} className="rounded-xl" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Criteria list */}
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : criteria.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">No criteria yet. Add sections to evaluate.</p>
              <p className="text-xs text-muted-foreground mt-1">Examples: Taste, Speed, Cleanliness, Presentation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {criteria.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteCriteria(c.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
