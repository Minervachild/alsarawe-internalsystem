import { useState, memo } from 'react';
import { GripVertical, MoreHorizontal, Trash2, ArrowRight, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ItemsEditor } from './ItemsEditor';
import { PersonSelector } from './PersonSelector';

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

interface BoardTableRowProps {
  row: BoardRow;
  columns: BoardColumn[];
  clients: { id: string; name: string }[];
  employees: Employee[];
  onUpdateCell: (rowId: string, columnId: string, value: any) => void;
  onDeleteRow: (rowId: string) => void;
  onMoveRow: (rowId: string, targetGroupId: string) => void;
  allGroups: BoardGroup[];
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onAddColumnOption?: (columnId: string, newOption: string) => void;
  onAddEmployee?: (name: string) => Promise<Employee | null>;
}

export const BoardTableRow = memo(function BoardTableRow({
  row,
  columns,
  clients,
  employees,
  onUpdateCell,
  onDeleteRow,
  onMoveRow,
  allGroups,
  onDragStart,
  onDragEnd,
  isDragging,
  onAddColumnOption,
  onAddEmployee,
}: BoardTableRowProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [addingOptionForColumn, setAddingOptionForColumn] = useState<string | null>(null);

  const getCellValue = (columnId: string) => {
    return row.cells[columnId];
  };

  const handleCellClick = (columnId: string, type: string) => {
    if (type === 'checkbox' || type === 'select' || type === 'person' || type === 'relation') {
      return; // These are handled inline
    }
    setEditingCell(columnId);
  };

  const handleCellBlur = (columnId: string, value: any) => {
    onUpdateCell(row.id, columnId, value);
    setEditingCell(null);
  };

  const renderCell = (column: BoardColumn) => {
    const value = getCellValue(column.id);
    const isEditing = editingCell === column.id;

    switch (column.type) {
      case 'text':
        if (isEditing) {
          return (
            <Input
              autoFocus
              defaultValue={value || ''}
              onBlur={(e) => handleCellBlur(column.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellBlur(column.id, e.currentTarget.value);
                }
              }}
              className="h-7 text-sm border-0 focus-visible:ring-1"
            />
          );
        }
        return (
          <span 
            className="text-sm truncate cursor-text"
            onClick={() => handleCellClick(column.id, column.type)}
          >
            {value || <span className="text-muted-foreground">—</span>}
          </span>
        );

      case 'number':
        if (isEditing) {
          return (
            <Input
              autoFocus
              type="number"
              defaultValue={value || ''}
              onBlur={(e) => handleCellBlur(column.id, parseFloat(e.target.value) || 0)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellBlur(column.id, parseFloat(e.currentTarget.value) || 0);
                }
              }}
              className="h-7 text-sm border-0 focus-visible:ring-1"
            />
          );
        }
        return (
          <span 
            className="text-sm cursor-text"
            onClick={() => handleCellClick(column.id, column.type)}
          >
            {value !== undefined ? value : <span className="text-muted-foreground">—</span>}
          </span>
        );

      case 'select':
        const options = Array.isArray(column.options) ? column.options : [];
        const selectedOption = options.find((opt: any) => 
          typeof opt === 'string' ? opt === value : opt.value === value
        );
        const displayValue = typeof selectedOption === 'string' ? selectedOption : selectedOption?.label || value;
        const optionColor = typeof selectedOption === 'object' ? selectedOption?.color : null;
        const isLocationColumn = column.name === 'Location';
        
        return (
          <div className="flex items-center gap-1">
            <Select
              value={value || ''}
              onValueChange={(val) => {
                if (val === '__add_new__') {
                  setAddingOptionForColumn(column.id);
                } else {
                  onUpdateCell(row.id, column.id, val);
                }
              }}
            >
              <SelectTrigger className="h-7 text-sm border-0 bg-transparent hover:bg-muted/50">
                {value ? (
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: optionColor || getStatusColor(value) }}
                  >
                    {displayValue}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {options.map((opt: any) => {
                  const optValue = typeof opt === 'string' ? opt : opt.value;
                  const optLabel = typeof opt === 'string' ? opt : opt.label;
                  const color = typeof opt === 'object' ? opt.color : null;
                  return (
                    <SelectItem key={optValue} value={optValue}>
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: color || getStatusColor(optValue) }}
                      >
                        {optLabel}
                      </span>
                    </SelectItem>
                  );
                })}
                {isLocationColumn && (
                  <SelectItem value="__add_new__">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Plus className="w-3 h-3" />
                      Add new city
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {addingOptionForColumn === column.id && (
              <Popover open onOpenChange={(open) => !open && setAddingOptionForColumn(null)}>
                <PopoverTrigger asChild>
                  <span />
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="City name..."
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      autoFocus
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newOptionValue.trim() && onAddColumnOption) {
                          onAddColumnOption(column.id, newOptionValue.trim());
                          onUpdateCell(row.id, column.id, newOptionValue.trim());
                          setNewOptionValue('');
                          setAddingOptionForColumn(null);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );

      case 'date':
        if (isEditing) {
          return (
            <Input
              autoFocus
              type="date"
              defaultValue={value || ''}
              onBlur={(e) => handleCellBlur(column.id, e.target.value)}
              className="h-7 text-sm border-0 focus-visible:ring-1"
            />
          );
        }
        return (
          <div 
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => handleCellClick(column.id, column.type)}
          >
            {value ? (
              <>
                <span className="text-sm">{formatDate(value)}</span>
                {isToday(value) && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-destructive text-white">
                    TODAY
                  </span>
                )}
                {isDueSoon(value) && !isToday(value) && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white">
                    {getDaysUntil(value)}D
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Set due date</span>
            )}
          </div>
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
            <SelectTrigger className="h-7 text-sm border-0 bg-transparent hover:bg-muted/50">
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
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.name}>
                  {client.name}
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

      default:
        return (
          <span className="text-sm text-muted-foreground">—</span>
        );
    }
  };

  return (
    <div
      className={cn(
        "grid border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group",
        isDragging && "opacity-50 bg-muted"
      )}
      style={{ 
        gridTemplateColumns: `40px repeat(${columns.length}, minmax(120px, 1fr)) 40px` 
      }}
      draggable
      onDragStart={(e) => onDragStart(e, row.id)}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle */}
      <div className="p-2 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Cells */}
      {columns.map((column) => (
        <div key={column.id} className="p-2 flex items-center min-w-0">
          {renderCell(column)}
        </div>
      ))}

      {/* Actions */}
      <div className="p-2 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                    <DropdownMenuItem 
                      key={g.id}
                      onClick={() => onMoveRow(row.id, g.id)}
                    >
                      <span 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDeleteRow(row.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// Helper functions
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Payment statuses
    'Paid': '#22c55e',
    'Partially Paid': '#f59e0b',
    'Not Paid': '#ef4444',
    // Priority
    'High': '#ef4444',
    'Medium': '#f59e0b',
    'Low': '#22c55e',
    // Phase
    'Green Beans': '#84cc16',
    'Roasting': '#f97316',
    'Packaging': '#8b5cf6',
    // Order Type
    'Sarawe Packaging': '#8b5cf6',
    'White Label': '#06b6d4',
    'Customer Packaging': '#ec4899',
    // Shipping Method
    'Picked up by customer': '#22c55e',
    'Delivered by us': '#3b82f6',
    'Third-party courier': '#f59e0b',
    // Location placeholders
    'Riyadh': '#22c55e',
    'Jeddah': '#3b82f6',
  };
  return colors[status] || '#6b7280';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr);
  return today.toDateString() === date.toDateString();
}

function isDueSoon(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 7;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const date = new Date(dateStr);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
