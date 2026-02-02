import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Edit2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

const CATEGORY_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', 
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16'
];

export default function DailyDuties() {
  const [categories, setCategories] = useState<DutyCategory[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
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
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, dutiesRes] = await Promise.all([
        supabase.from('duty_categories').select('*').order('position'),
        supabase.from('duties').select('*').order('position'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (dutiesRes.error) throw dutiesRes.error;

      setCategories(categoriesRes.data || []);
      setDuties(dutiesRes.data || []);
      
      // Expand all categories by default
      setExpandedCategories(new Set((categoriesRes.data || []).map(c => c.id)));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('duty_categories')
        .insert({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          position: categories.length,
        })
        .select()
        .single();

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
      const { error } = await supabase
        .from('duty_categories')
        .update({ name: newCategoryName.trim(), color: newCategoryColor })
        .eq('id', editingCategory.id);

      if (error) throw error;

      setCategories(categories.map(c => 
        c.id === editingCategory.id 
          ? { ...c, name: newCategoryName.trim(), color: newCategoryColor }
          : c
      ));
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
          position: categoryDuties.length,
        })
        .select()
        .single();

      if (error) throw error;

      setDuties([...duties, data]);
      setNewDutyTitle('');
      setNewDutyDescription('');
      setIsDutyDialogOpen(false);
      toast({ title: 'Duty added' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    setNewDutyTitle('');
    setNewDutyDescription('');
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Daily Check-In Duties</h1>
            <p className="text-muted-foreground mt-1">Manage duty categories and checklists for shift start</p>
          </div>
          <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
            setIsCategoryDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setNewCategoryName('');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl btn-premium">
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
                  <Input
                    placeholder="e.g., Cleaning & Hygiene"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full transition-all ${
                          newCategoryColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategoryColor(color)}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={editingCategory ? handleUpdateCategory : handleAddCategory} 
                  className="w-full rounded-xl"
                  disabled={!newCategoryName.trim()}
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Categories Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create duty categories to organize your daily checklists.
              </p>
            </div>
          ) : (
            categories.map((category) => {
              const categoryDuties = duties.filter(d => d.category_id === category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <Collapsible key={category.id} open={isExpanded}>
                  <div className="card-premium overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <h3 className="font-semibold text-foreground">{category.name}</h3>
                          <span className="text-sm text-muted-foreground">
                            ({categoryDuties.length} {categoryDuties.length === 1 ? 'duty' : 'duties'})
                          </span>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg"
                            onClick={() => openAddDuty(category.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg"
                            onClick={() => openEditCategory(category)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/40">
                        {categoryDuties.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground">
                            No duties in this category yet.
                            <Button 
                              variant="link" 
                              className="px-1"
                              onClick={() => openAddDuty(category.id)}
                            >
                              Add one
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/40">
                            {categoryDuties.map((duty) => (
                              <div key={duty.id} className="flex items-center justify-between p-4 hover:bg-muted/20">
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                  <div>
                                    <p className="font-medium text-foreground">{duty.title}</p>
                                    {duty.description && (
                                      <p className="text-sm text-muted-foreground">{duty.description}</p>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDuty(duty.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </div>

        {/* Add Duty Dialog */}
        <Dialog open={isDutyDialogOpen} onOpenChange={setIsDutyDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Duty</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Duty Title</Label>
                <Input
                  placeholder="e.g., Clean espresso machine"
                  value={newDutyTitle}
                  onChange={(e) => setNewDutyTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Additional details..."
                  value={newDutyDescription}
                  onChange={(e) => setNewDutyDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button 
                onClick={handleAddDuty} 
                className="w-full rounded-xl"
                disabled={!newDutyTitle.trim()}
              >
                Add Duty
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
