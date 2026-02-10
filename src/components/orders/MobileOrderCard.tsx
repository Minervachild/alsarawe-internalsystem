import { memo } from 'react';
import { Trash2, ArrowRight, ChevronRight } from 'lucide-react';
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
  const getCellValue = (columnName: string) => {
    const column = columns.find(c => c.name === columnName);
    if (!column) return null;
    return row.cells[column.id];
  };

  const client = getCellValue('Client');
  const total = getCellValue('Total');
  const dueDate = getCellValue('Due Date');
  const priority = getCellValue('Priority');
  const paymentStatus = getCellValue('Payment Status');
  const assignedTo = getCellValue('Assigned To');

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

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3.5 space-y-2.5 active:bg-muted/30 transition-colors">
      {/* Top row: client + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {client || 'Untitled Order'}
          </h4>
          {assignedTo && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{assignedTo}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
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

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {priority && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPriorityColor(priority)}`}>
            {priority}
          </span>
        )}
        {paymentStatus && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentColor(paymentStatus)}`}>
            {paymentStatus}
          </span>
        )}
      </div>

      {/* Bottom row: created + date */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {row.created_at ? (
          <span>Created {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : (
          <span>—</span>
        )}
        {dueDate ? (
          <span>Due {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : (
          <span>No date</span>
        )}
      </div>
    </div>
  );
});
