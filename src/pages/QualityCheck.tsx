import { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, Trash2, Edit2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { QualityItemCard, type QualityItem, type QualityReview } from '@/components/quality/QualityItemCard';
import { PerformReviewDialog } from '@/components/quality/PerformReviewDialog';
import { ManageCriteriaDialog } from '@/components/quality/ManageCriteriaDialog';
import { ReviewHistoryDialog } from '@/components/quality/ReviewHistoryDialog';

interface QualitySection {
  id: string;
  name: string;
  position: number;
}

interface Employee {
  id: string;
  name: string;
}

const CYCLE_OPTIONS = [
  { value: '1', label: 'Every day' },
  { value: '2', label: 'Every 2 days' },
  { value: '3', label: 'Every 3 days' },
  { value: '5', label: 'Every 5 days' },
  { value: '7', label: 'Every week' },
  { value: '14', label: 'Every 2 weeks' },
  { value: '30', label: 'Every month' },
];

export default function QualityCheck() {
  const [sections, setSections] = useState<QualitySection[]>([]);
  const [items, setItems] = useState<QualityItem[]>([]);
  const [lastReviews, setLastReviews] = useState<Record<string, QualityReview>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');

  // Add item dialog
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCycle, setNewItemCycle] = useState('7');
  const [editingItem, setEditingItem] = useState<QualityItem | null>(null);

  // Review dialog
  const [reviewItem, setReviewItem] = useState<QualityItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Criteria dialog
  const [criteriaItem, setCriteriaItem] = useState<QualityItem | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);

  // History dialog
  const [historyItem, setHistoryItem] = useState<QualityItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sectionsRes, itemsRes, employeesRes] = await Promise.all([
        supabase.from('quality_sections').select('*').order('position'),
        supabase.from('quality_items').select('*').order('position'),
        supabase.from('employees').select('id, name').order('name'),
      ]);

      if (sectionsRes.error) throw sectionsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      const fetchedSections = sectionsRes.data || [];
      const fetchedItems = itemsRes.data || [];

      setSections(fetchedSections);
      setItems(fetchedItems);
      setEmployees(employeesRes.data || []);

      if (fetchedSections.length > 0 && !activeSection) {
        setActiveSection(fetchedSections[0].id);
      }

      // Fetch last review for each item
      await fetchLastReviews(fetchedItems);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLastReviews = async (allItems: QualityItem[]) => {
    const reviewMap: Record<string, QualityReview> = {};
    
    for (const item of allItems) {
      const { data } = await supabase
        .from('quality_reviews')
        .select('*, employees(name)')
        .eq('item_id', item.id)
        .order('performed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        reviewMap[item.id] = {
          ...data,
          employee_name: (data as any).employees?.name || 'Unknown',
        };
      }
    }

    setLastReviews(reviewMap);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !activeSection) return;
    try {
      const sectionItems = items.filter(i => i.section_id === activeSection);
      
      if (editingItem) {
        const { error } = await supabase
          .from('quality_items')
          .update({
            name: newItemName.trim(),
            cycle_days: parseInt(newItemCycle),
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        setItems(items.map(i => i.id === editingItem.id ? { ...i, name: newItemName.trim(), cycle_days: parseInt(newItemCycle) } : i));
        toast({ title: 'Item updated' });
      } else {
        const { data, error } = await supabase
          .from('quality_items')
          .insert({
            section_id: activeSection,
            name: newItemName.trim(),
            cycle_days: parseInt(newItemCycle),
            position: sectionItems.length,
          })
          .select()
          .single();
        if (error) throw error;
        setItems([...items, data]);
        toast({ title: 'Item added' });
      }

      setNewItemName('');
      setNewItemCycle('7');
      setEditingItem(null);
      setIsAddItemOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('quality_items').delete().eq('id', itemId);
      if (error) throw error;
      setItems(items.filter(i => i.id !== itemId));
      const newReviews = { ...lastReviews };
      delete newReviews[itemId];
      setLastReviews(newReviews);
      toast({ title: 'Item deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEditItem = (item: QualityItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemCycle(item.cycle_days.toString());
    setIsAddItemOpen(true);
  };

  const openPerformReview = (item: QualityItem) => {
    setReviewItem(item);
    setIsReviewOpen(true);
  };

  const openManageCriteria = (item: QualityItem) => {
    setCriteriaItem(item);
    setIsCriteriaOpen(true);
  };

  const openViewHistory = (item: QualityItem) => {
    setHistoryItem(item);
    setIsHistoryOpen(true);
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
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Quality Check</h1>
            <p className="text-muted-foreground mt-1">Scheduled quality inspections with review tracking</p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setNewItemName('');
                setNewItemCycle('7');
                setIsAddItemOpen(true);
              }}
              className="rounded-xl btn-premium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Sections Found</h2>
            <p className="text-muted-foreground">Quality check sections will appear here.</p>
          </div>
        ) : (
          <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
            <TabsList className="rounded-xl">
              {sections.map(section => (
                <TabsTrigger key={section.id} value={section.id} className="rounded-lg gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map(section => {
              const sectionItems = items.filter(i => i.section_id === section.id);

              return (
                <TabsContent key={section.id} value={section.id} className="space-y-6">
                  {sectionItems.length === 0 ? (
                    <div className="card-premium p-12 text-center">
                      <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No items in {section.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        {isAdmin ? 'Add quality check items to start tracking.' : 'No items have been set up yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionItems.map(item => (
                        <div key={item.id} className="relative group">
                          <QualityItemCard
                            item={item}
                            lastReview={lastReviews[item.id] || null}
                            isAdmin={isAdmin}
                            onPerformReview={openPerformReview}
                            onManageCriteria={openManageCriteria}
                            onViewHistory={openViewHistory}
                          />
                          {isAdmin && (
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg bg-card/80 backdrop-blur-sm"
                                onClick={() => openEditItem(item)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg bg-card/80 backdrop-blur-sm text-destructive hover:text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Add/Edit Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={(open) => {
          setIsAddItemOpen(open);
          if (!open) { setEditingItem(null); setNewItemName(''); setNewItemCycle('7'); }
        }}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Quality Item' : 'Add Quality Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the item details' : `Add a new item to ${sections.find(s => s.id === activeSection)?.name || 'this section'}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  placeholder="e.g., Coffee of the Day, Machine Maintenance..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Check Cycle</Label>
                <Select value={newItemCycle} onValueChange={setNewItemCycle}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddItem}
                className="w-full rounded-xl"
                disabled={!newItemName.trim()}
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Perform Review Dialog */}
        <PerformReviewDialog
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          item={reviewItem}
          lastReview={reviewItem ? lastReviews[reviewItem.id] || null : null}
          employees={employees}
          onSuccess={() => fetchData()}
        />

        {/* Manage Criteria Dialog */}
        <ManageCriteriaDialog
          open={isCriteriaOpen}
          onOpenChange={setIsCriteriaOpen}
          item={criteriaItem}
          onSuccess={() => fetchData()}
        />

        {/* Review History Dialog */}
        <ReviewHistoryDialog
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          item={historyItem}
        />
      </div>
    </AppLayout>
  );
}
