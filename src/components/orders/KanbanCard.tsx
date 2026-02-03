import { GripVertical, Calendar, User } from 'lucide-react';

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  position: number;
}

interface BoardRow {
  id: string;
  group_id: string;
  position: number;
  cells: Record<string, any>;
}

interface KanbanCardProps {
  row: BoardRow;
  columns: BoardColumn[];
  onDragStart: (e: React.DragEvent) => void;
  isDragging: boolean;
}

export function KanbanCard({ row, columns, onDragStart, isDragging }: KanbanCardProps) {
  const getCellValue = (columnName: string) => {
    const column = columns.find(c => c.name === columnName);
    if (!column) return null;
    return row.cells[column.id];
  };

  const client = getCellValue('Client');
  const total = getCellValue('Total');
  const dueDate = getCellValue('Due Date');
  const assignedTo = getCellValue('Assigned To');
  const priority = getCellValue('Priority');
  const isPaid = getCellValue('Paid');

  const getPriorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          {/* Client Name */}
          <h4 className="font-medium text-foreground truncate">
            {client || 'Untitled Order'}
          </h4>

          {/* Priority Badge */}
          {priority && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${getPriorityColor(priority)}`}>
              {priority}
            </span>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            {total && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">﷼</span>
                <span>{total}</span>
              </div>
            )}
            {dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            {assignedTo && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{assignedTo}</span>
              </div>
            )}
            {isPaid !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded ${isPaid ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
