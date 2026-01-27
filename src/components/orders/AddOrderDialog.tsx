import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  options?: any;
  position: number;
}

interface Client {
  id: string;
  name: string;
}

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  columns: BoardColumn[];
  onSuccess: () => void;
}

export function AddOrderDialog({ open, onOpenChange, groupId, columns, onSuccess }: AddOrderDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchClients();
      setFormData({});
    }
  }, [open]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    setIsLoading(true);

    try {
      // Create the row
      const { data: row, error: rowError } = await supabase
        .from('board_rows')
        .insert({
          group_id: groupId,
          position: 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (rowError) throw rowError;

      // Create cells for each column with data
      const cellsToInsert = columns
        .filter(col => formData[col.id] !== undefined && formData[col.id] !== '')
        .map(col => ({
          row_id: row.id,
          column_id: col.id,
          value: formData[col.id],
        }));

      if (cellsToInsert.length > 0) {
        const { error: cellsError } = await supabase
          .from('board_cells')
          .insert(cellsToInsert);

        if (cellsError) throw cellsError;
      }

      toast({
        title: 'Order created',
        description: 'New order has been added to the board.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (column: BoardColumn) => {
    const value = formData[column.id];

    switch (column.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [column.id]: e.target.value }))}
            placeholder={`Enter ${column.name.toLowerCase()}`}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [column.id]: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [column.id]: e.target.value }))}
          />
        );
      
      case 'select':
        const options = Array.isArray(column.options) ? column.options : [];
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setFormData(prev => ({ ...prev, [column.id]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${column.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [column.id]: checked }))}
            />
            <span className="text-sm text-muted-foreground">Yes</span>
          </div>
        );
      
      case 'relation':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setFormData(prev => ({ ...prev, [column.id]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [column.id]: e.target.value }))}
            placeholder={`Enter ${column.name.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Order</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {columns
            .filter(col => col.type !== 'items_qty' && col.type !== 'person' && col.type !== 'files')
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <div key={column.id} className="space-y-2">
                <Label>{column.name}</Label>
                {renderField(column)}
              </div>
            ))}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
