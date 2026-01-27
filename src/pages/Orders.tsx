import { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, GripVertical, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KanbanCard } from '@/components/orders/KanbanCard';
import { AddOrderDialog } from '@/components/orders/AddOrderDialog';

interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface BoardRow {
  id: string;
  group_id: string;
  position: number;
  cells: Record<string, any>;
}

interface BoardColumn {
  id: string;
  name: string;
  type: string;
  position: number;
}

export default function Orders() {
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggedRow, setDraggedRow] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('board_groups')
        .select('*')
        .order('position');
      
      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('board_columns')
        .select('*')
        .order('position');
      
      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch rows with cells
      const { data: rowsData, error: rowsError } = await supabase
        .from('board_rows')
        .select(`
          *,
          board_cells (*)
        `)
        .order('position');
      
      if (rowsError) throw rowsError;
      
      // Transform rows to include cells as a map
      const transformedRows = (rowsData || []).map((row: any) => ({
        ...row,
        cells: (row.board_cells || []).reduce((acc: any, cell: any) => {
          acc[cell.column_id] = cell.value;
          return acc;
        }, {}),
      }));
      
      setRows(transformedRows);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRow(rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    
    if (!draggedRow) return;

    try {
      const { error } = await supabase
        .from('board_rows')
        .update({ group_id: targetGroupId })
        .eq('id', draggedRow);

      if (error) throw error;

      setRows(prev => 
        prev.map(row => 
          row.id === draggedRow ? { ...row, group_id: targetGroupId } : row
        )
      );

      toast({
        title: 'Order moved',
        description: 'Order has been moved to the new stage.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to move order.',
        variant: 'destructive',
      });
    }

    setDraggedRow(null);
  };

  const handleAddOrder = (groupId: string) => {
    setSelectedGroupId(groupId);
    setAddOrderOpen(true);
  };

  const getRowsForGroup = (groupId: string) => {
    return rows.filter(row => row.group_id === groupId);
  };

  const getColumnValue = (row: BoardRow, columnName: string) => {
    const column = columns.find(c => c.name === columnName);
    if (!column) return null;
    return row.cells[column.id];
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse-soft text-muted-foreground">Loading orders...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">B2B Orders</h1>
            <p className="text-muted-foreground">Manage your order pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Configure Board
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="kanban-column flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, group.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: group.color }}
                  />
                  <h3 className="font-semibold text-foreground">{group.name}</h3>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                    {getRowsForGroup(group.id).length}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem>Edit Stage</DropdownMenuItem>
                    <DropdownMenuItem>Change Color</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Stage</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[300px]">
                {getRowsForGroup(group.id).map((row) => (
                  <KanbanCard
                    key={row.id}
                    row={row}
                    columns={columns}
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    isDragging={draggedRow === row.id}
                  />
                ))}
              </div>

              {/* Add Button */}
              <Button
                variant="ghost"
                className="w-full mt-2 border-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                onClick={() => handleAddOrder(group.id)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Order
              </Button>
            </div>
          ))}

          {/* Add Column */}
          <div className="flex-shrink-0 w-80">
            <Button
              variant="ghost"
              className="w-full h-12 border-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </div>
      </div>

      <AddOrderDialog
        open={addOrderOpen}
        onOpenChange={setAddOrderOpen}
        groupId={selectedGroupId}
        columns={columns}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}
