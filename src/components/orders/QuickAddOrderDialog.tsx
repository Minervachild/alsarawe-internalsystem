import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemsEditor } from './ItemsEditor';
import { PersonSelector } from './PersonSelector';

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  options?: any;
  position: number;
}

interface Employee {
  id: string;
  name: string;
  avatar_color: string;
}

interface QuickAddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: BoardColumn[];
  clients: { id: string; name: string; location?: string | null }[];
  employees: Employee[];
  newGroupId: string;
  onSubmit: (cells: Record<string, any>) => void;
  onAddColumnOption?: (columnId: string, newOption: string) => void;
  onAddEmployee?: (name: string) => Promise<Employee | null>;
}

export function QuickAddOrderDialog({
  open,
  onOpenChange,
  columns,
  clients,
  employees,
  newGroupId,
  onSubmit,
  onAddColumnOption,
  onAddEmployee,
}: QuickAddOrderDialogProps) {
  const [cells, setCells] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) setCells({});
  }, [open]);

  const updateCell = (columnId: string, value: any) => {
    setCells(prev => ({ ...prev, [columnId]: value }));
  };

  const clientCol = columns.find(c => c.type === 'relation' || c.name === 'Client');
  const itemsCol = columns.find(c => c.type === 'items_qty' || c.name === 'Items');

  const hasClient = !!(clientCol && cells[clientCol.id]);
  const hasItems = !!(itemsCol && Array.isArray(cells[itemsCol.id]) && cells[itemsCol.id].length > 0 && cells[itemsCol.id].every((i: any) => i.name && i.qty));
  const canSubmit = hasClient && hasItems;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(cells);
    onOpenChange(false);
  };

  // Show relevant columns for New section
  const relevantNames = ['Client', 'Items', 'Due Date', 'Assigned To', 'Priority', 'Payment Status', 'Order Type', 'Location', 'Notes'];
  const relevantColumns = columns.filter(c => relevantNames.includes(c.name));

  const renderField = (column: BoardColumn) => {
    const value = cells[column.id];

    switch (column.type) {
      case 'relation':
        return (
          <Select value={value || ''} onValueChange={(val) => updateCell(column.id, val)}>
            <SelectTrigger className="rounded-xl">
              <span className={value ? '' : 'text-muted-foreground'}>
                {value || 'Select client...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'items_qty':
        return (
          <ItemsEditor
            value={value || null}
            onChange={(items) => updateCell(column.id, items)}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateCell(column.id, e.target.value)}
            className="rounded-xl"
          />
        );

      case 'person':
        return (
          <PersonSelector
            value={value}
            employees={employees}
            onChange={(val) => updateCell(column.id, val)}
            onAddEmployee={onAddEmployee}
          />
        );

      case 'select': {
        const isLocationColumn = column.name === 'Location';
        const options = isLocationColumn
          ? [...new Set(clients.map(c => c.location).filter(Boolean))].map(loc => loc as string)
          : (Array.isArray(column.options) ? column.options : []);
        return (
          <Select value={value || ''} onValueChange={(val) => updateCell(column.id, val)}>
            <SelectTrigger className="rounded-xl">
              <span className={value ? '' : 'text-muted-foreground'}>
                {value || `Select ${column.name.toLowerCase()}...`}
              </span>
            </SelectTrigger>
            <SelectContent>
              {isLocationColumn
                ? (options as string[]).map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))
                : options.map((opt: any) => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                      <SelectItem key={optValue} value={optValue}>{optLabel}</SelectItem>
                    );
                  })}
            </SelectContent>
          </Select>
        );
      }

      case 'text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateCell(column.id, e.target.value)}
            placeholder={`Enter ${column.name.toLowerCase()}...`}
            className="rounded-xl min-h-[60px]"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateCell(column.id, parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="rounded-xl"
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateCell(column.id, e.target.value)}
            className="rounded-xl"
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-destructive" />
            Quick Add Order
          </DialogTitle>
          <DialogDescription>
            Add a new order to the pipeline. Client and Items with quantities are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {relevantColumns.map(column => (
            <div key={column.id} className="space-y-1.5">
              <Label className="text-sm font-medium">{column.name}</Label>
              {renderField(column)}
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Add Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
