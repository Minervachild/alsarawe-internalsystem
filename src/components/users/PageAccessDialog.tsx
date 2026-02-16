import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardList,
  Warehouse,
  Building2,
  Clock,
  CheckSquare,
  ClipboardCheck,
  Receipt,
  Coffee,
  Lock,
  Settings,
} from 'lucide-react';

const ALL_PAGES = [
  { key: 'orders', label: 'B2B Orders', icon: ClipboardList },
  { key: 'inventory', label: 'Inventory', icon: Warehouse },
  { key: 'clients', label: 'Clients', icon: Building2 },
  { key: 'overtime', label: 'Overtime', icon: Clock },
  { key: 'daily-duties', label: 'Daily Duties', icon: CheckSquare },
  { key: 'quality-check', label: 'Quality Check', icon: ClipboardCheck },
  { key: 'sales', label: 'Registering Sales', icon: Receipt },
  { key: 'products', label: 'Products', icon: Coffee },
  { key: 'accounts', label: 'Accounts', icon: Lock },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface PageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export function PageAccessDialog({
  open,
  onOpenChange,
  userId,
  username,
  onSuccess,
}: PageAccessDialogProps) {
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [hasCustomAccess, setHasCustomAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchAccess();
    }
  }, [open, userId]);

  const fetchAccess = async () => {
    const { data } = await supabase
      .from('user_page_access')
      .select('page')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      setSelectedPages(new Set(data.map((d: any) => d.page)));
      setHasCustomAccess(true);
    } else {
      // No custom access = all pages
      setSelectedPages(new Set(ALL_PAGES.map(p => p.key)));
      setHasCustomAccess(false);
    }
  };

  const togglePage = (page: string) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
    setHasCustomAccess(true);
  };

  const selectAll = () => {
    setSelectedPages(new Set(ALL_PAGES.map(p => p.key)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
    setHasCustomAccess(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Delete existing entries
      await supabase
        .from('user_page_access')
        .delete()
        .eq('user_id', userId);

      const allSelected = selectedPages.size === ALL_PAGES.length;

      if (!allSelected && selectedPages.size > 0) {
        // Insert selected pages
        const entries = Array.from(selectedPages).map(page => ({
          user_id: userId,
          page,
        }));
        const { error } = await supabase.from('user_page_access').insert(entries);
        if (error) throw error;
      }
      // If all selected, don't insert anything (means "full access")

      toast({ title: 'Page access updated' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Page Access — {username}</DialogTitle>
          <DialogDescription>
            Choose which pages this user can see. If all are selected, the user has full access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {selectedPages.size}/{ALL_PAGES.length} pages selected
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                None
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {ALL_PAGES.map(({ key, label, icon: Icon }) => (
              <label
                key={key}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedPages.has(key)}
                  onCheckedChange={() => togglePage(key)}
                />
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}