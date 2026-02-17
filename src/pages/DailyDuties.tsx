import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Edit2, GripVertical, ChevronDown, ChevronRight, Play, Star, AlertTriangle, CheckCircle2, Clock, Calendar, Tag, ClipboardList } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShiftCheckInDialog } from '@/components/dailyduties/ShiftCheckInDialog';
import { AttendanceHistory } from '@/components/dailyduties/AttendanceHistory';
import { ShiftChecklist } from '@/components/dailyduties/ShiftChecklist';
import { format } from 'date-fns';

interface DutyCategory {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Duty {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  role: string | null;
  position: number;
  is_end_of_day: boolean;
  is_recurring: boolean;
  target_date: string | null;
}

interface Employee {
  id: string;
  name: string;
  role: string | null;
}

interface DutyRating {
  dutyId: string;
  rating: number;
  reason: string;
}

const CATEGORY_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', 
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16'
];

const EMPLOYEE_ROLES = [
  'Team Leader', 'Supervisor', 'Barista', 'Cashier', 'Cleaner', 'Kitchen Staff', 'Team Member'
];

export default function DailyDuties() {
  const [categories, setCategories] = useState<DutyCategory[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('duties');
  
  // Shift check-in dialog
  const [isShiftCheckInOpen, setIsShiftCheckInOpen] = useState(false);
  
  // Checklist mode
  const [checklistEmployeeId, setChecklistEmployeeId] = useState<string>('');
  const [checklistEmployeeName, setChecklistEmployeeName] = useState<string>('');
  const [checklistEmployeeRole, setChecklistEmployeeRole] = useState<string | null>(null);
  
  // Check-in mode (duty rating)
  const [isCheckInMode, setIsCheckInMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [currentDutyIndex, setCurrentDutyIndex] = useState(0);
  const [dutyRatings, setDutyRatings] = useState<DutyRating[]>([]);
  const [currentRating, setCurrentRating] = useState<number>(5);
  const [currentReason, setCurrentReason] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  
  // Add category dialog
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [editingCategory, setEditingCategory] = useState<DutyCategory | null>(null);
  
  // Add duty dialog
  const [isDutyDialogOpen, setIsDutyDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newDutyTitle, setNewDutyTitle] = useState('');
  const [newDutyDescription, setNewDutyDescription] = useState('');
  const [newDutyRole, setNewDutyRole] = useState<string>('');
  const [newDutyIsEndOfDay, setNewDutyIsEndOfDay] = useState(false);
  const [newDutyIsRecurring, setNewDutyIsRecurring] = useState(true);
  const [newDutyTargetDate, setNewDutyTargetDate] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, dutiesRes, employeesRes] = await Promise.all([
        supabase.from('duty_categories').select('*').order('position'),
        supabase.from('duties').select('*').order('position'),
        supabase.from('employees').select('id, name, role').order('name'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (dutiesRes.error) throw dutiesRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setCategories(categoriesRes.data || []);
      setDuties((dutiesRes.data || []) as Duty[]);
      setEmployees(employeesRes.data || []);
      setExpandedCategories(new Set((categoriesRes.data || []).map(c => c.id)));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category drag and drop
  const handleCategoryDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const reorderedCategories = Array.from(categories);
    const [removed] = reorderedCategories.splice(sourceIndex, 1);
    reorderedCategories.splice(destIndex, 0, removed);

    const updatedCategories = reorderedCategories.map((cat, index) => ({ ...cat, position: index }));
    setCategories(updatedCategories);

    try {
      for (const update of updatedCategories) {
        await supabase.from('duty_categories').update({ position: update.position }).eq('id', update.id);
      }
      toast({ title: 'Order saved' });
    } catch (error: any) {
      toast({ title: 'Error saving order', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  // Get all duties flattened for check-in
  const allDuties = categories.flatMap(cat => 
    duties.filter(d => d.category_id === cat.id).map(duty => ({
      ...duty,
      categoryName: cat.name,
      categoryColor: cat.color,
    }))
  );

  const startCheckIn = () => {
    if (!selectedEmployee) {
      toast({ title: 'Select Employee', description: 'Please select who is checking in.', variant: 'destructive' });
      return;
    }
    if (allDuties.length === 0) {
      toast({ title: 'No Duties', description: 'Add some duties first.', variant: 'destructive' });
      return;
    }
    setIsCheckInMode(true);
    setCurrentDutyIndex(0);
    setDutyRatings([]);
    setCurrentRating(5);
    setCurrentReason('');
    setShowSummary(false);
  };

  const openChecklist = () => {
    if (!checklistEmployeeId) {
      toast({ title: 'Select Employee', description: 'Please select an employee.', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === checklistEmployeeId);
    if (emp) {
      setChecklistEmployeeName(emp.name);
      setChecklistEmployeeRole(emp.role);
      setActiveTab('checklist');
    }
  };

  const submitRating = () => {
    const currentDuty = allDuties[currentDutyIndex];
    setDutyRatings([...dutyRatings, { dutyId: currentDuty.id, rating: currentRating, reason: currentReason }]);
    if (currentDutyIndex < allDuties.length - 1) {
      setCurrentDutyIndex(currentDutyIndex + 1);
      setCurrentRating(5);
      setCurrentReason('');
    } else {
      setShowSummary(true);
    }
  };

  const finishCheckIn = async () => {
    try {
      const completions = dutyRatings.map(r => ({
        duty_id: r.dutyId,
        employee_id: selectedEmployee,
        rating: r.rating,
        reason: r.reason || null,
      }));
      const { error } = await supabase.from('duty_completions').insert(completions);
      if (error) throw error;
      toast({ title: 'Check-in Complete', description: 'All ratings have been saved.' });
      setIsCheckInMode(false);
      setShowSummary(false);
      setSelectedEmployee('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const cancelCheckIn = () => {
    setIsCheckInMode(false);
    setShowSummary(false);
    setCurrentDutyIndex(0);
    setDutyRatings([]);
  };

  const focusAreas = dutyRatings
    .filter(r => r.rating <= 3)
    .map(r => ({ ...r, duty: allDuties.find(d => d.id === r.dutyId) }))
    .sort((a, b) => a.rating - b.rating);

  // Category/Duty management
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('duty_categories')
        .insert({ name: newCategoryName.trim(), color: newCategoryColor, position: categories.length })
        .select().single();
      if (error) throw error;
      setCategories([...categories, data]);
      setNewCategoryName('');
      setNewCategoryColor(CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length]);
      setIsCategoryDialogOpen(false);
      toast({ title: 'Category added' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    try {
      const { error } = await supabase.from('duty_categories')
        .update({ name: newCategoryName.trim(), color: newCategoryColor })
        .eq('id', editingCategory.id);
      if (error) throw error;
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim(), color: newCategoryColor } : c));
      setEditingCategory(null);
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      toast({ title: 'Category updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('duty_categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      setDuties(duties.filter(d => d.category_id !== id));
      toast({ title: 'Category deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddDuty = async () => {
    if (!newDutyTitle.trim() || !selectedCategoryId) return;
    try {
      const categoryDuties = duties.filter(d => d.category_id === selectedCategoryId);
      const { data, error } = await supabase
        .from('duties')
        .insert({
          category_id: selectedCategoryId,
          title: newDutyTitle.trim(),
          description: newDutyDescription.trim() || null,
          role: newDutyRole || null,
          position: categoryDuties.length,
          is_end_of_day: newDutyIsEndOfDay,
          is_recurring: newDutyIsRecurring,
          target_date: !newDutyIsRecurring && newDutyTargetDate ? newDutyTargetDate : null,
        })
        .select().single();
      if (error) throw error;
      setDuties([...duties, data as Duty]);
      resetDutyForm();
      setIsDutyDialogOpen(false);
      toast({ title: 'Duty added' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetDutyForm = () => {
    setNewDutyTitle('');
    setNewDutyDescription('');
    setNewDutyRole('');
    setNewDutyIsEndOfDay(false);
    setNewDutyIsRecurring(true);
    setNewDutyTargetDate('');
  };

  const handleDeleteDuty = async (id: string) => {
    try {
      const { error } = await supabase.from('duties').delete().eq('id', id);
      if (error) throw error;
      setDuties(duties.filter(d => d.id !== id));
      toast({ title: 'Duty deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEditCategory = (category: DutyCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setIsCategoryDialogOpen(true);
  };

  const openAddDuty = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    resetDutyForm();
    setIsDutyDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // Check-in Rating View
  if (isCheckInMode && !showSummary) {
    const currentDuty = allDuties[currentDutyIndex];
    const progress = ((currentDutyIndex + 1) / allDuties.length) * 100;

    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-[600px] mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Duty {currentDutyIndex + 1} of {allDuties.length}</span>
              <Button variant="ghost" size="sm" onClick={cancelCheckIn}>Cancel</Button>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="card-premium p-6 space-y-6">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${currentDuty.categoryColor}15`, color: currentDuty.categoryColor }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDuty.categoryColor }} />
              {currentDuty.categoryName}
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">{currentDuty.title}</h2>
              {currentDuty.description && <p className="text-muted-foreground mt-2">{currentDuty.description}</p>}
              {currentDuty.is_end_of_day && (
                <Badge variant="outline" className="mt-2"><Clock className="w-3 h-3 mr-1" /> Anytime Today</Badge>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base">Rate this duty (0-5)</Label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setCurrentRating(rating)}
                    className={`w-12 h-12 rounded-xl text-lg font-semibold transition-all ${
                      currentRating === rating
                        ? rating <= 2 ? 'bg-destructive text-white scale-110' 
                          : rating <= 3 ? 'bg-warning text-white scale-110'
                          : 'bg-success text-white scale-110'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentRating <= 2 ? 'Needs immediate attention' : currentRating <= 3 ? 'Could be improved' : currentRating <= 4 ? 'Good condition' : 'Excellent'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes / Reason for rating {currentRating <= 3 && <span className="text-destructive">*</span>}</Label>
              <Textarea
                placeholder={currentRating <= 3 ? "Please explain what needs attention..." : "Optional notes..."}
                value={currentReason}
                onChange={(e) => setCurrentReason(e.target.value)}
                className="rounded-xl min-h-[100px]"
              />
            </div>

            <Button 
              onClick={submitRating} 
              className="w-full rounded-xl h-12 text-base"
              disabled={currentRating <= 3 && !currentReason.trim()}
            >
              {currentDutyIndex < allDuties.length - 1 ? 'Next Duty' : 'Finish Review'}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Summary View
  if (showSummary) {
    const avgRating = dutyRatings.reduce((sum, r) => sum + r.rating, 0) / dutyRatings.length;

    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-[700px] mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold">Check-in Complete</h1>
            <p className="text-muted-foreground mt-1">
              Average rating: <span className="font-semibold text-foreground">{avgRating.toFixed(1)}/5</span>
            </p>
          </div>

          {focusAreas.length > 0 && (
            <div className="card-premium p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h2 className="text-lg font-semibold">Focus Areas ({focusAreas.length})</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">These items rated 3 or below need attention:</p>
              <div className="space-y-3">
                {focusAreas.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${item.rating <= 2 ? 'bg-destructive' : 'bg-warning'}`}>
                      {item.rating}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{item.duty?.title}</p>
                      {item.reason && <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {focusAreas.length === 0 && (
            <div className="card-premium p-6 mb-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h3 className="font-semibold text-lg">All Clear!</h3>
              <p className="text-muted-foreground">No items need immediate attention.</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={cancelCheckIn} className="flex-1 rounded-xl h-12">Back to Management</Button>
            <Button onClick={finishCheckIn} className="flex-1 rounded-xl h-12">Save & Complete</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Management View with Tabs
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Daily Check-In</h1>
            <p className="text-muted-foreground mt-1">Manage duties, shift attendance, and view history</p>
          </div>
          <Button onClick={() => setIsShiftCheckInOpen(true)} className="rounded-xl gap-2">
            <Clock className="w-4 h-4" />
            Shift Check-In
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="duties" className="rounded-lg gap-2">
              <CheckSquare className="w-4 h-4" />
              Duties
            </TabsTrigger>
            <TabsTrigger value="checklist" className="rounded-lg gap-2">
              <ClipboardList className="w-4 h-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg gap-2">
              <Calendar className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ========== CHECKLIST TAB ========== */}
          <TabsContent value="checklist" className="space-y-6">
            {!checklistEmployeeId || activeTab !== 'checklist' ? (
              <div className="card-premium p-6">
                <h3 className="font-semibold mb-4">Select Employee for Checklist</h3>
                <div className="flex items-center gap-3">
                  <Select value={checklistEmployeeId} onValueChange={setChecklistEmployeeId}>
                    <SelectTrigger className="flex-1 rounded-xl">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} {emp.role ? `(${emp.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openChecklist} className="rounded-xl">Open Checklist</Button>
                </div>
              </div>
            ) : (
              <div className="max-w-[600px] mx-auto">
                <Button variant="ghost" className="mb-4 rounded-xl" onClick={() => { setChecklistEmployeeId(''); }}>
                  ← Change Employee
                </Button>
                <div className="card-premium p-6">
                  <ShiftChecklist
                    employeeId={checklistEmployeeId}
                    employeeName={checklistEmployeeName}
                    employeeRole={checklistEmployeeRole}
                    onClose={() => setChecklistEmployeeId('')}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ========== DUTIES TAB ========== */}
          <TabsContent value="duties" className="space-y-6">
            {/* Start Duty Check-in Card */}
            {allDuties.length > 0 && (
              <div className="card-premium p-6 bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Start Duty Check-in</h3>
                      <p className="text-sm text-muted-foreground">Rate all {allDuties.length} duties with notes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="w-[200px] rounded-xl">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={startCheckIn} className="rounded-xl btn-premium">
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Category Management Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Drag categories to reorder priority</p>
              <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                setIsCategoryDialogOpen(open);
                if (!open) { setEditingCategory(null); setNewCategoryName(''); }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Duty Category'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input placeholder="e.g., Cleaning & Hygiene" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategoryColor(color)}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                    <Button onClick={editingCategory ? handleUpdateCategory : handleAddCategory} className="w-full rounded-xl" disabled={!newCategoryName.trim()}>
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Draggable Categories List */}
            <DragDropContext onDragEnd={handleCategoryDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {categories.length === 0 ? (
                      <div className="card-premium p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <CheckSquare className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Categories Yet</h2>
                        <p className="text-muted-foreground">Create duty categories to organize your daily checklists.</p>
                      </div>
                    ) : (
                      categories.map((category, index) => {
                        const categoryDuties = duties.filter(d => d.category_id === category.id);
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                          <Draggable key={category.id} draggableId={category.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`card-premium overflow-hidden ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                              >
                                <Collapsible open={isExpanded}>
                                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCategory(category.id)}>
                                          {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                                          <h3 className="font-semibold text-foreground">{category.name}</h3>
                                          <span className="text-sm text-muted-foreground">({categoryDuties.length})</span>
                                        </div>
                                      </CollapsibleTrigger>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openAddDuty(category.id)}><Plus className="w-4 h-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditCategory(category)}><Edit2 className="w-4 h-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                  </div>
                                  <CollapsibleContent>
                                    <div className="border-t border-border/40">
                                      {categoryDuties.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                          No duties in this category yet.
                                          <Button variant="link" className="px-1" onClick={() => openAddDuty(category.id)}>Add one</Button>
                                        </div>
                                      ) : (
                                        <div className="divide-y divide-border/40">
                                          {categoryDuties.map((duty) => (
                                            <div key={duty.id} className="flex items-center justify-between p-4 hover:bg-muted/20">
                                              <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-muted-foreground w-6">#{duty.position + 1}</span>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground">{duty.title}</p>
                                                    {duty.role && <Badge variant="secondary" className="text-xs">{duty.role}</Badge>}
                                                    {duty.is_end_of_day && <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Anytime</Badge>}
                                                    {!duty.is_recurring && <Badge variant="outline" className="text-xs bg-warning/10 border-warning/30 text-warning">One-time{duty.target_date ? ` · ${duty.target_date}` : ''}</Badge>}
                                                  </div>
                                                  {duty.description && <p className="text-sm text-muted-foreground">{duty.description}</p>}
                                                </div>
                                              </div>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteDuty(duty.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add Duty Dialog */}
            <Dialog open={isDutyDialogOpen} onOpenChange={(open) => { setIsDutyDialogOpen(open); if (!open) resetDutyForm(); }}>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Add Duty</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Duty Title</Label>
                    <Input placeholder="e.g., Clean espresso machine" value={newDutyTitle} onChange={(e) => setNewDutyTitle(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input placeholder="Additional details..." value={newDutyDescription} onChange={(e) => setNewDutyDescription(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role (leave empty for all roles)</Label>
                    <Select value={newDutyRole} onValueChange={setNewDutyRole}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Roles</SelectItem>
                        {EMPLOYEE_ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Anytime Today (End-of-Day)</Label>
                      <p className="text-xs text-muted-foreground">Can be done at any point during the shift</p>
                    </div>
                    <Switch checked={newDutyIsEndOfDay} onCheckedChange={setNewDutyIsEndOfDay} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recurring Daily</Label>
                      <p className="text-xs text-muted-foreground">Repeats every day automatically</p>
                    </div>
                    <Switch checked={newDutyIsRecurring} onCheckedChange={setNewDutyIsRecurring} />
                  </div>
                  {!newDutyIsRecurring && (
                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Input type="date" value={newDutyTargetDate} onChange={(e) => setNewDutyTargetDate(e.target.value)} className="rounded-xl" />
                    </div>
                  )}
                  <Button onClick={handleAddDuty} className="w-full rounded-xl" disabled={!newDutyTitle.trim()}>Add Duty</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="history">
            <AttendanceHistory />
          </TabsContent>
        </Tabs>

        <ShiftCheckInDialog
          open={isShiftCheckInOpen}
          onOpenChange={setIsShiftCheckInOpen}
          onSuccess={() => {
            if (activeTab === 'history') {
              // AttendanceHistory will refetch on mount
            }
          }}
        />
      </div>
    </AppLayout>
  );
}
