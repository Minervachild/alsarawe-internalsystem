import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Star, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QualityItem } from './QualityItemCard';

interface ReviewWithRatings {
  id: string;
  performed_at: string;
  notes: string | null;
  improvement_target: string | null;
  employee_name: string;
  ratings: { criteria_name: string; rating: number; note: string | null }[];
  avgRating: number;
}

interface ReviewHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: QualityItem | null;
}

export function ReviewHistoryDialog({ open, onOpenChange, item }: ReviewHistoryDialogProps) {
  const [reviews, setReviews] = useState<ReviewWithRatings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item) fetchHistory();
  }, [open, item]);

  const fetchHistory = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const { data: reviewsData, error } = await supabase
        .from('quality_reviews')
        .select('*, employees(name)')
        .eq('item_id', item.id)
        .order('performed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const enriched: ReviewWithRatings[] = [];
      for (const r of reviewsData || []) {
        const { data: ratingsData } = await supabase
          .from('quality_review_ratings')
          .select('*, quality_criteria(name)')
          .eq('review_id', r.id)
          .order('created_at');

        const ratings = (ratingsData || []).map((rt: any) => ({
          criteria_name: rt.quality_criteria?.name || 'Unknown',
          rating: rt.rating,
          note: rt.note,
        }));

        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, rt) => sum + rt.rating, 0) / ratings.length
          : 0;

        enriched.push({
          id: r.id,
          performed_at: r.performed_at,
          notes: r.notes,
          improvement_target: r.improvement_target,
          employee_name: (r as any).employees?.name || 'Unknown',
          ratings,
          avgRating,
        });
      }

      setReviews(enriched);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review History: {item?.name}</DialogTitle>
          <DialogDescription>Past quality reviews and performance trends</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No reviews yet</div>
        ) : (
          <div className="space-y-4 py-2">
            {reviews.map((review) => (
              <div key={review.id} className="card-premium p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(review.performed_at), 'MMM d, yyyy · h:mm a')}</p>
                    <p className="text-xs text-muted-foreground">by {review.employee_name}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full ${
                      review.avgRating >= 4 ? 'border-success text-success' :
                      review.avgRating >= 3 ? 'border-warning text-warning' :
                      'border-destructive text-destructive'
                    }`}
                  >
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {review.avgRating.toFixed(1)}
                  </Badge>
                </div>

                {review.ratings.length > 0 && (
                  <div className="space-y-1.5">
                    {review.ratings.map((rt, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{rt.criteria_name}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= rt.rating ? 'fill-warning text-warning' : 'text-muted-foreground/20'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {review.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">{review.notes}</p>
                )}

                {review.improvement_target && (
                  <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-2">
                    <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground">{review.improvement_target}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
