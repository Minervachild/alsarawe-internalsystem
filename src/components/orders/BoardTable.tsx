import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BoardTableRow } from './BoardTableRow';
import { MobileOrderCard } from './MobileOrderCard';
import { DraggableColumnHeader } from './DraggableColumnHeader';
import { CycleTargetEditor } from './CycleTargetEditor';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  target_days?: number;
}

// Column visibility by group name
const GROUP_COLUMN_VISIBILITY: Record<string, string[]> = {
  'New': ['Client', 'Items', 'Due Date', 'Assigned To', 'Priority', 'Payment Status', 'Order Type', 'Location'],
  'Preparing': ['Client', 'Items', 'Due Date', 'Assigned To', 'Priority', 'Payment Status', 'Phase'],
  'Ready': ['Client', 'Items', 'Due Date', 'Assigned To', 'Priority', 'Payment Status', 'Shipping Method'],
  'Shipped': ['Client', 'Items', 'Due Date', 'Assigned To', 'Priority', 'Payment Status', 'Delivery Proof'],
};

interface Employee {
  id: string;
  name: string;
  avatar_color: string;
}

interface BoardTableProps {
  group: BoardGroup;
  columns: BoardColumn[];
  rows: BoardRow[];
  clients: { id: string; name: string; location?: string | null }[];
  employees: Employee[];
  onAddRow: (groupId: string) => void;
  onUpdateCell: (rowId: string, columnId: string, value: any) => void;
  onDeleteRow: (rowId: string) => void;
  onMoveRow: (rowId: string, targetGroupId: string) => void;
  allGroups: BoardGroup[];
  onAddColumnOption?: (columnId: string, newOption: string) => void;
  onAddEmployee?: (name: string) => Promise<Employee | null>;
  onReorderColumns?: (fromIndex: number, toIndex: number) => void;
  onUpdateTargetDays?: (groupId: string, targetDays: number) => void;
}

export function BoardTable({
  group,
  columns,
  rows,
  clients,
  employees,
  onAddRow,
  onUpdateCell,
  onDeleteRow,
  onMoveRow,
  allGroups,
  onAddColumnOption,
  onAddEmployee,
  onReorderColumns,
  onUpdateTargetDays,
}: BoardTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Memoize average cycle calculation
  const avgCycle = useMemo(() => {
    if (rows.length === 0) return 0;
    const now = new Date();
    const totalDays = rows.reduce((sum, row) => {
      if (row.created_at) {
        const created = new Date(row.created_at);
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }
      return sum;
    }, 0);
    return Math.round(totalDays / rows.length);
  }, [rows]);

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('text/plain');
    if (rowId && rowId !== draggedRowId) {
      // Check if moving to Shipped group - require delivery proof
      if (group.name === 'Shipped') {
        const row = rows.find(r => r.id === rowId);
        // Find the delivery proof column
        const deliveryProofCol = columns.find(c => c.name === 'Delivery Proof');
        if (deliveryProofCol) {
          const proof = row?.cells[deliveryProofCol.id];
          if (!proof || (Array.isArray(proof) && proof.length === 0)) {
            toast({
              title: 'Delivery Proof Required',
              description: 'Please upload a delivery authentication document before moving to Shipped.',
              variant: 'destructive',
            });
            setDraggedRowId(null);
            return;
          }
        }
      }
      onMoveRow(rowId, group.id);
    }
    setDraggedRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
  };

  // Get columns visible for this group
  const groupVisibleColumns = GROUP_COLUMN_VISIBILITY[group.name] || [];
  const visibleColumns = useMemo(() => 
    columns.filter(col => groupVisibleColumns.length === 0 || groupVisibleColumns.includes(col.name)),
    [columns, groupVisibleColumns]
  );

  const handleColumnReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (onReorderColumns) {
      const actualFromIndex = columns.findIndex(c => c.id === visibleColumns[fromIndex]?.id);
      const actualToIndex = columns.findIndex(c => c.id === visibleColumns[toIndex]?.id);
      if (actualFromIndex !== -1 && actualToIndex !== -1) {
        onReorderColumns(actualFromIndex, actualToIndex);
      }
    }
  }, [onReorderColumns, columns, visibleColumns]);

  return (
    <div 
      className="mb-4 sm:mb-6"
      onDragOver={!isMobile ? handleDragOver : undefined}
      onDrop={!isMobile ? handleDrop : undefined}
    >
      {/* Group Header */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
        <h3 
          className="font-semibold text-sm sm:text-base"
          style={{ color: group.color }}
        >
          {group.name}
        </h3>
        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary">
          Avg {avgCycle}d
        </span>
        <CycleTargetEditor
          groupId={group.id}
          currentTarget={group.target_days ?? 7}
          onUpdate={onUpdateTargetDays}
        />
        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground">
          {rows.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            <DropdownMenuItem>Edit Group</DropdownMenuItem>
            <DropdownMenuItem>Change Color</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete Group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Mobile: Card view */}
          {isMobile ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {rows.map((row) => (
                <MobileOrderCard
                  key={row.id}
                  row={row}
                  columns={columns}
                  allGroups={allGroups}
                  onDeleteRow={onDeleteRow}
                  onMoveRow={onMoveRow}
                />
              ))}
              <Button
                variant="ghost"
                className="w-full border border-dashed border-border/50 text-muted-foreground text-sm py-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRow(group.id);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Item
              </Button>
            </div>
          ) : (
            /* Desktop: Table view */
            <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
              {/* Table Header */}
              <div className="grid bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground"
                style={{ 
                  gridTemplateColumns: `40px repeat(${visibleColumns.length}, minmax(120px, 1fr)) 40px` 
                }}
              >
                <div className="p-2" />
                {visibleColumns.map((column, index) => (
                  <DraggableColumnHeader
                    key={column.id}
                    column={column}
                    index={index}
                    onReorder={handleColumnReorder}
                  />
                ))}
                <div className="p-2 flex items-center justify-center">
                  <Plus className="w-4 h-4 cursor-pointer hover:text-foreground" />
                </div>
              </div>

              {/* Table Rows */}
              {rows.map((row) => (
                <BoardTableRow
                  key={row.id}
                  row={row}
                  columns={visibleColumns}
                  clients={clients}
                  employees={employees}
                  onUpdateCell={onUpdateCell}
                  onDeleteRow={onDeleteRow}
                  onMoveRow={onMoveRow}
                  allGroups={allGroups}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedRowId === row.id}
                  onAddColumnOption={onAddColumnOption}
                  onAddEmployee={onAddEmployee}
                />
              ))}

              {/* Add New Item Row */}
              <div 
                className="grid border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                style={{ 
                  gridTemplateColumns: `40px repeat(${visibleColumns.length}, minmax(120px, 1fr)) 40px` 
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRow(group.id);
                }}
              >
                <div className="p-2" />
                <div className="p-2 flex items-center gap-2 text-muted-foreground col-span-full">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">New Item</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ColumnIcon({ type }: { type: string }) {
  const iconClass = "w-3 h-3 text-muted-foreground";
  
  switch (type) {
    case 'text':
      return <span className={iconClass}>T</span>;
    case 'number':
      return <span className={iconClass}>#</span>;
    case 'select':
    case 'multi_select':
      return <span className={iconClass}>≡</span>;
    case 'date':
      return <span className={iconClass}>📅</span>;
    case 'person':
      return <span className={iconClass}>👤</span>;
    case 'checkbox':
      return <span className={iconClass}>☐</span>;
    case 'relation':
      return <span className={iconClass}>🔗</span>;
    case 'items_qty':
      return <span className={iconClass}>📦</span>;
    default:
      return <span className={iconClass}>T</span>;
  }
}
