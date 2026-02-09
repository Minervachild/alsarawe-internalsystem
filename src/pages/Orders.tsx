import { useState, useEffect } from 'react';
import { Plus, Search, LayoutGrid, BarChart3, Users, Clock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BoardTable } from '@/components/orders/BoardTable';
import { useAuth } from '@/contexts/AuthContext';

interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  target_days?: number;
}

interface BoardRow {
  id: string;
  group_id: string;
  position: number;
  cells: Record<string, any>;
  created_at?: string;
}

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

interface Employee {
  id: string;
  name: string;
  avatar_color: string;
}

export default function Orders() {
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#22c55e');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [groupsRes, columnsRes, rowsRes, clientsRes, employeesRes] = await Promise.all([
        supabase.from('board_groups').select('*').order('position'),
        supabase.from('board_columns').select('*').order('position'),
        supabase.from('board_rows').select('*, board_cells(*)').order('position'),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('employees').select('id, name, avatar_color').order('name'),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (columnsRes.error) throw columnsRes.error;
      if (rowsRes.error) throw rowsRes.error;

      setGroups(groupsRes.data || []);
      setColumns(columnsRes.data || []);
      setClients(clientsRes.data || []);
      setEmployees(employeesRes.data || []);

      // Transform rows to include cells as a map
      const transformedRows = (rowsRes.data || []).map((row: any) => ({
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

  const handleAddRow = async (groupId: string) => {
    try {
      // Get max position in group
      const groupRows = rows.filter(r => r.group_id === groupId);
      const maxPosition = groupRows.length > 0 
        ? Math.max(...groupRows.map(r => r.position)) + 1 
        : 0;

      const { data: newRow, error } = await supabase
        .from('board_rows')
        .insert({
          group_id: groupId,
          position: maxPosition,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setRows(prev => [...prev, { ...newRow, cells: {} }]);
      toast({ title: 'New order added' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add order.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCell = async (rowId: string, columnId: string, value: any) => {
    try {
      // Check if cell exists
      const { data: existingCell } = await supabase
        .from('board_cells')
        .select('id')
        .eq('row_id', rowId)
        .eq('column_id', columnId)
        .maybeSingle();

      if (existingCell) {
        await supabase
          .from('board_cells')
          .update({ value })
          .eq('id', existingCell.id);
      } else {
        await supabase
          .from('board_cells')
          .insert({ row_id: rowId, column_id: columnId, value });
      }

      // Update local state
      setRows(prev => prev.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            cells: { ...row.cells, [columnId]: value }
          };
        }
        return row;
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update cell.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    // Optimistic update - remove from UI immediately
    const previousRows = rows;
    setRows(prev => prev.filter(row => row.id !== rowId));
    toast({ title: 'Order deleted' });

    try {
      // Delete in background
      await Promise.all([
        supabase.from('board_cells').delete().eq('row_id', rowId),
        supabase.from('board_rows').delete().eq('id', rowId),
      ]);
    } catch (error: any) {
      // Rollback on failure
      setRows(previousRows);
      toast({
        title: 'Error',
        description: 'Failed to delete order.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveRow = async (rowId: string, targetGroupId: string) => {
    // Optimistic update
    const previousRows = rows;
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, group_id: targetGroupId } : row
    ));
    toast({ title: 'Order moved' });

    try {
      await supabase
        .from('board_rows')
        .update({ group_id: targetGroupId })
        .eq('id', rowId);
    } catch (error: any) {
      setRows(previousRows);
      toast({
        title: 'Error',
        description: 'Failed to move order.',
        variant: 'destructive',
      });
    }
  };

  const handleAddColumnOption = async (columnId: string, newOption: string) => {
    try {
      const column = columns.find(c => c.id === columnId);
      if (!column) return;

      const currentOptions = Array.isArray(column.options) ? column.options : [];
      const updatedOptions = [...currentOptions, newOption];

      await supabase
        .from('board_columns')
        .update({ options: updatedOptions })
        .eq('id', columnId);

      setColumns(prev => prev.map(col => {
        if (col.id === columnId) {
          return { ...col, options: updatedOptions };
        }
        return col;
      }));

      toast({ title: `Added "${newOption}" to options` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add option.',
        variant: 'destructive',
      });
    }
  };

  const handleAddEmployee = async (name: string): Promise<{ id: string; name: string; avatar_color: string } | null> => {
    try {
      // Generate a random avatar color
      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert({
          name: name.trim(),
          avatar_color: randomColor,
        })
        .select('id, name, avatar_color')
        .single();

      if (error) throw error;

      setEmployees(prev => [...prev, newEmployee]);
      toast({ title: `Added employee: ${name}` });
      return newEmployee;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add employee.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleReorderColumns = async (fromIndex: number, toIndex: number) => {
    try {
      const newColumns = [...columns];
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, movedColumn);

      const updatedColumns = newColumns.map((col, idx) => ({ ...col, position: idx }));
      setColumns(updatedColumns);

      // Batch update all positions in parallel
      await Promise.all(
        updatedColumns.map(col =>
          supabase.from('board_columns').update({ position: col.position }).eq('id', col.id)
        )
      );

      toast({ title: 'Column order updated' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to reorder columns.',
        variant: 'destructive',
      });
      fetchData();
    }
  };
  const handleUpdateTargetDays = async (groupId: string, targetDays: number) => {
    try {
      await supabase
        .from('board_groups')
        .update({ target_days: targetDays } as any)
        .eq('id', groupId);

      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, target_days: targetDays } : g
      ));
      toast({ title: `Target set to ${targetDays} days` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update target days.',
        variant: 'destructive',
      });
    }
  };


  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const maxPosition = groups.length > 0 
        ? Math.max(...groups.map(g => g.position)) + 1 
        : 0;

      const { data: newGroup, error } = await supabase
        .from('board_groups')
        .insert({
          name: newGroupName.trim(),
          color: newGroupColor,
          position: maxPosition,
        })
        .select()
        .single();

      if (error) throw error;

      setGroups(prev => [...prev, newGroup]);
      setAddGroupDialogOpen(false);
      setNewGroupName('');
      setNewGroupColor('#22c55e');
      toast({ title: 'Group added' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add group.',
        variant: 'destructive',
      });
    }
  };

  const getRowsForGroup = (groupId: string) => {
    return rows
      .filter(row => row.group_id === groupId)
      .filter(row => {
        if (!searchQuery) return true;
        // Search across all cell values
        return Object.values(row.cells).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
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
      <div className="p-3 sm:p-6 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">B2B Orders</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your order pipeline</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="board" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="board" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                <LayoutGrid className="w-4 h-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="hidden sm:flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="employees" className="gap-2">
                  <Users className="w-4 h-4" />
                  Employees
                </TabsTrigger>
                <TabsTrigger value="overtime" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Overtime
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="board" className="space-y-3 sm:space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Board Tables */}
            <div className="overflow-x-auto">
              {groups.map((group) => (
                <BoardTable
                  key={group.id}
                  group={group}
                  columns={columns}
                  rows={getRowsForGroup(group.id)}
                  clients={clients}
                  employees={employees}
                  onAddRow={handleAddRow}
                  onUpdateCell={handleUpdateCell}
                  onDeleteRow={handleDeleteRow}
                  onMoveRow={handleMoveRow}
                  allGroups={groups}
                  onAddColumnOption={handleAddColumnOption}
                  onAddEmployee={handleAddEmployee}
                  onReorderColumns={handleReorderColumns}
                  onUpdateTargetDays={handleUpdateTargetDays}
                />
              ))}

              {/* Add New Group */}
              <Button
                variant="ghost"
                className="w-full border-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border py-6"
                onClick={() => setAddGroupDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Group
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12 text-muted-foreground">
              Analytics coming soon...
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <div className="text-center py-12 text-muted-foreground">
              Navigate to the Employees section from the sidebar.
            </div>
          </TabsContent>

          <TabsContent value="overtime">
            <div className="text-center py-12 text-muted-foreground">
              Navigate to the Overtime section from the sidebar.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Group Dialog */}
      <Dialog open={addGroupDialogOpen} onOpenChange={setAddGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., In Progress"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Group</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
