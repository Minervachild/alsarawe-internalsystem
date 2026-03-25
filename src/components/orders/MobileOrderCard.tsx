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

interface MobileOrderCardProps {
  row: BoardRow;
  columns: BoardColumn[];
  allGroups: BoardGroup[];
  onDeleteRow: (rowId: string) => void;
  onMoveRow: (rowId: string, targetGroupId: string) => void;
}

export const MobileOrderCard = memo(function MobileOrderCard({
  row,
  columns,
  allGroups,
  onDeleteRow,
  onMoveRow,
}: MobileOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getCellValue = (columnName: string) => {
    const column = columns.find(c => c.name === columnName);
    if (!column) return null;
    return row.cells[column.id];
  };

  const client = getCellValue('Client');
  const items = getCellValue('Items');
  const dueDate = getCellValue('Due Date');
  const priority = getCellValue('Priority');
  const paymentStatus = getCellValue('Payment Status');
  const assignedTo = getCellValue('Assigned To');
  const phase = getCellValue('Phase');
  const orderType = getCellValue('Order Type');

  const getPriorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high': return 'bg-destructive/15 text-destructive';
      case 'medium': return 'bg-warning/15 text-warning';
      case 'low': return 'bg-success/15 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentColor = (s: string) => {
    switch (s) {
      case 'Paid': return 'bg-success/15 text-success';
      case 'Partially Paid': return 'bg-info/15 text-info';
      case 'Not Paid': return 'bg-destructive/15 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3.5 space-y-2 active:bg-muted/30 transition-colors">
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

      {showDetails && (
        <div className="border-t border-border/50 pt-2 space-y-1.5 text-xs">
          {assignedTo && (
            <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span>{assignedTo}</span></div>
          )}
          {priority && (
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(priority)}`}>{priority}</span></div>
          )}
          {paymentStatus && (
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className={`px-2 py-0.5 rounded-full font-medium ${getPaymentColor(paymentStatus)}`}>{paymentStatus}</span></div>
          )}
          {phase && (
            <div className="flex justify-between"><span className="text-muted-foreground">Phase</span><span>{phase}</span></div>
          )}
          {orderType && (
            <div className="flex justify-between"><span className="text-muted-foreground">Order Type</span><span>{orderType}</span></div>
          )}
          {dueDate && (
            <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {row.created_at ? (
          <span>Created {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : <span>—</span>}
        {dueDate ? (
          <span>Due {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : <span>No date</span>}
      </div>
    </div>
  );
});
