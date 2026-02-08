import { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QualityItem, QualityReview } from './QualityItemCard';

interface Criteria {
  id: string;
  item_id: string;
  name: string;
  position: number;
}

interface CriteriaRating {
  criteriaId: string;
  rating: number;
  note: string;
}

interface PerformReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: QualityItem | null;
  lastReview: QualityReview | null;
  employees: { id: string; name: string }[];
  onSuccess: () => void;
}

export function PerformReviewDialog({ open, onOpenChange, item, lastReview, employees, onSuccess }: PerformReviewDialogProps) {
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [ratings, setRatings] = useState<CriteriaRating[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [improvementTarget, setImprovementTarget] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item) {
      fetchCriteria();
      setOverallNotes('');
      setImprovementTarget('');
      setSelectedEmployee('');
    }
  }, [open, item]);

  const fetchCriteria = async () => {
    if (!item) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('quality_criteria')
        .select('*')
        .eq('item_id', item.id)
        .order('position');
      if (error) throw error;
      setCriteria(data || []);
      setRatings((data || []).map(c => ({ criteriaId: c.id, rating: 3, note: '' })));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const updateRating = (criteriaId: string, rating: number) => {
    setRatings(prev => prev.map(r => r.criteriaId === criteriaId ? { ...r, rating } : r));
  };

  const updateNote = (criteriaId: string, note: string) => {
    setRatings(prev => prev.map(r => r.criteriaId === criteriaId ? { ...r, note } : r));
  };

  const handleSubmit = async () => {
    if (!item) return;
    if (criteria.length > 0 && ratings.some(r => r.rating === 0)) {
      toast({ title: 'Please rate all criteria', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Create the review
      const { data: review, error: reviewError } = await supabase
        .from('quality_reviews')
        .insert({
          item_id: item.id,
          performed_by: selectedEmployee || null,
          notes: overallNotes || null,
          improvement_target: improvementTarget || null,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Create ratings for each criteria
      if (criteria.length > 0 && review) {
        const ratingsData = ratings.map(r => ({
          review_id: review.id,
          criteria_id: r.criteriaId,
          rating: r.rating,
          note: r.note || null,
        }));

        const { error: ratingsError } = await supabase
          .from('quality_review_ratings')
          .insert(ratingsData);

        if (ratingsError) throw ratingsError;
      }

      toast({ title: 'Review Saved', description: `Quality review for "${item.name}" has been recorded.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quality Review: {item?.name}</DialogTitle>
          <DialogDescription>Rate each criteria and add notes for improvement</DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 text-center text-muted-foreground">Loading criteria...</div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Previous improvement target */}
            {lastReview?.improvement_target && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Previous Target</p>
                <p className="text-sm text-foreground">{lastReview.improvement_target}</p>
              </div>
            )}

            {/* Employee selector */}
            <div className="space-y-2">
              <Label>Performed by</Label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Criteria ratings */}
            {criteria.length === 0 ? (
              <div className="card-premium p-6 text-center">
                <p className="text-muted-foreground text-sm">No criteria defined for this item.</p>
                <p className="text-xs text-muted-foreground mt-1">Add criteria via the settings button to enable detailed rating.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {criteria.map((c) => {
                  const rating = ratings.find(r => r.criteriaId === c.id);
                  return (
                    <div key={c.id} className="card-premium p-4 space-y-3">
                      <h4 className="font-medium text-foreground">{c.name}</h4>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => updateRating(c.id, star)}
                            className="transition-all"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                (rating?.rating || 0) >= star
                                  ? 'fill-warning text-warning'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground self-center">
                          {rating?.rating || 0}/5
                        </span>
                      </div>
                      <Textarea
                        placeholder="Optional note for this criteria..."
                        value={rating?.note || ''}
                        onChange={(e) => updateNote(c.id, e.target.value)}
                        className="rounded-xl min-h-[60px] text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Average rating summary */}
            {criteria.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-sm text-muted-foreground">Average:</span>
                <span className={`text-lg font-semibold ${
                  avgRating >= 4 ? 'text-success' : avgRating >= 3 ? 'text-warning' : 'text-destructive'
                }`}>
                  {avgRating.toFixed(1)}/5
                </span>
              </div>
            )}

            {/* Overall notes */}
            <div className="space-y-2">
              <Label>Overall Notes (optional)</Label>
              <Textarea
                placeholder="General observations about this review..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            {/* Improvement target */}
            <div className="space-y-2">
              <Label>Improvement Target for Next Review</Label>
              <Textarea
                placeholder="What should be improved by the next review..."
                value={improvementTarget}
                onChange={(e) => setImprovementTarget(e.target.value)}
                className="rounded-xl min-h-[60px]"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full rounded-xl h-12 text-base"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Submit Review'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
