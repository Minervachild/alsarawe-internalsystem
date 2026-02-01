import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  options?: any;
  position: number;
}

interface DraggableColumnHeaderProps {
  column: BoardColumn;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
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
    case 'files':
      return <span className={iconClass}>📎</span>;
    default:
      return <span className={iconClass}>T</span>;
  }
}

export function DraggableColumnHeader({ column, index, onReorder }: DraggableColumnHeaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('column-index', index.toString());
    e.dataTransfer.setData('column-id', column.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedIndex = e.dataTransfer.getData('column-index');
    if (draggedIndex !== '' && parseInt(draggedIndex) !== index) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const fromIndex = parseInt(e.dataTransfer.getData('column-index'));
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  return (
    <div
      className={cn(
        "p-2 flex items-center gap-1 truncate group cursor-move select-none transition-colors",
        isDragging && "opacity-50 bg-muted",
        isDragOver && "bg-primary/10 border-l-2 border-primary"
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      <ColumnIcon type={column.type} />
      <span className="truncate">{column.name}</span>
    </div>
  );
}
