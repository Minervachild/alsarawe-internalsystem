import { memo, useState } from 'react';
import { Trash2, ArrowRight, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ItemsEditor } from './ItemsEditor';
import { PersonSelector } from './PersonSelector';
import { DeliveryProofUploader } from './DeliveryProofUploader';

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  options?: any;
  position: number;
}

interface BoardRow {
  id: string;
  group_id: string;
  position: number;
  cells: Record<string, any>;
  created_at?: string;
}

interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Employee {
  id: string;
  name: string;
  avatar_color: string;
}

interface MobileOrderCardProps {
  row: BoardRow;
  columns: BoardColumn[];
  allGroups: BoardGroup[];
  clients: { id: string; name: string; location?: string | null }[];
  employees: Employee[];
  onDeleteRow: (rowId: string) => void;
  onMoveRow: (rowId: string, targetGroupId: string) => void;
  onUpdateCell: (rowId: string, columnId: string, value: any) => void;
  onAddEmployee?: (name: string) => Promise<Employee | null>;
}

export const MobileOrderCard = memo(function MobileOrderCard({
  row,
  columns,
  allGroups,
  clients,
  employees,
  onDeleteRow,
  onMoveRow,
  onUpdateCell,
  onAddEmployee,
}: MobileOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getCellValue = (columnName: string) => {
    const column = columns.find(c => c.name === columnName);
    if (!column) return null;
    return row.cells[column.id];
  };

  const client = getCellValue('Client');
  const items = getCellValue('Items');

  // Primary columns shown in the card header
  const primaryColumnNames = ['Client', 'Items'];
  // Detail columns = everything else
  const detailColumns = columns
    .filter(c => !primaryColumnNames.includes(c.name))
    .sort((a, b) => a.position - b.position);

  const formatItems = (itemsValue: any) => {
    if (!itemsValue) return null;
    if (Array.isArray(itemsValue)) {
      return itemsValue.map((item: any) => {
        if (typeof item === 'string') return item;
        return `${item.product || item.name || ''}${item.qty ? ` × ${item.qty}` : ''}`;
      }).filter(Boolean).join(', ');
    }
    return String(itemsValue);
  };

  const renderCellValue = (column: BoardColumn) => {
    const value = row.cells[column.id];

    switch (column.type) {
      case 'select': {
        const options = Array.isArray(column.options) ? column.options : [];
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => onUpdateCell(row.id, column.id, val)}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent">
              {value ? (
                <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: getStatusColor(value) }}>
                  {value}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {options.map((opt: any) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return (
                  <SelectItem key={optValue} value={optValue}>
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: getStatusColor(optValue) }}>
                      {optLabel}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
      }

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onUpdateCell(row.id, column.id, e.target.value)}
            className="h-7 text-xs border-0 bg-transparent"
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onUpdateCell(row.id, column.id, checked)}
          />
        );

      case 'person':
        return (
          <PersonSelector
            value={value}
            employees={employees}
            onChange={(val) => onUpdateCell(row.id, column.id, val)}
            onAddEmployee={onAddEmployee}
          />
        );

      case 'relation':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => onUpdateCell(row.id, column.id, val)}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent">
              {value ? (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">🔗</span>
                  {value}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'items_qty':
        return (
          <ItemsEditor
            value={value}
            onChange={(items) => onUpdateCell(row.id, column.id, items)}
          />
        );

      case 'files':
        return (
          <DeliveryProofUploader
            value={value}
            onChange={(urls) => onUpdateCell(row.id, column.id, urls)}
            rowId={row.id}
          />
        );

      case 'number':
        return (
          <span className="text-xs">
            {value !== undefined && value !== null ? value : <span className="text-muted-foreground">—</span>}
          </span>
        );

      default:
        return (
          <span className="text-xs">
            {value || <span className="text-muted-foreground">—</span>}
          </span>
        );
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3.5 space-y-2 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" onClick={() => setShowDetails(!showDetails)}>
          <h4 className="font-medium text-sm text-foreground truncate">
            {client || 'Untitled Order'}
          </h4>
          {formatItems(items) && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{formatItems(items)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-popover">
                  {allGroups
                    .filter(g => g.id !== row.group_id)
                    .map((g) => (
                      <DropdownMenuItem key={g.id} onClick={() => onMoveRow(row.id, g.id)}>
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(row.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showDetails && detailColumns.length > 0 && (
        <div className="border-t border-border/50 pt-2 space-y-2.5 text-xs">
          {detailColumns.map((column) => (
            <div key={column.id} className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">{column.name}</span>
              <div className="min-h-[28px] flex items-center">
                {renderCellValue(column)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {row.created_at ? (
          <span>Created {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : <span>—</span>}
      </div>
    </div>
  );
});

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Paid': '#22c55e',
    'Partially Paid': '#3b82f6',
    'Not Paid': '#ef4444',
    'High': '#ef4444',
    'Medium': '#f59e0b',
    'Low': '#22c55e',
    'Green Beans': '#84cc16',
    'Roasting': '#f97316',
    'Packaging': '#8b5cf6',
    'Sarawe Packaging': '#8b5cf6',
    'White Label': '#06b6d4',
    'Customer Packaging': '#ec4899',
    'Picked up by customer': '#22c55e',
    'Delivered by us': '#3b82f6',
    'Third-party courier': '#f59e0b',
  };
  return colors[status] || '#6b7280';
}
