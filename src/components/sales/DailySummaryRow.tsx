import { useMemo } from 'react';
import { DollarSign, CreditCard, Send } from 'lucide-react';

interface SalesEntry {
  id: string;
  date: string;
  shift: string;
  branch_id: string;
  cash_amount: number;
  card_amount: number;
  transaction_count: number;
  status: string;
  posted_to_zoho?: boolean;
  branches?: { name: string };
}

interface Props {
  entries: SalesEntry[];
  filterDate: string;
  canSeeTotals: boolean;
}

export function DailySummaryRow({ entries, filterDate, canSeeTotals }: Props) {
  const dayEntries = useMemo(() => {
    if (!filterDate) return [];
    return entries.filter(e => e.date === filterDate && e.status !== 'rejected');
  }, [entries, filterDate]);

  if (!filterDate || dayEntries.length === 0) return null;

  const totalCash = dayEntries.reduce((s, e) => s + Number(e.cash_amount), 0);
  const totalCard = dayEntries.reduce((s, e) => s + Number(e.card_amount), 0);
  const grandTotal = totalCash + totalCard;
  const totalPosted = dayEntries.filter(e => (e as any).posted_to_zoho).length;
  const allPosted = totalPosted === dayEntries.length;

  return (
    <div className="card-premium p-4 mt-4">
      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">ملخص اليوم — {filterDate}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {canSeeTotals && (
          <>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">كاش</p>
                <p className="font-semibold">﷼{totalCash.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">شبكة</p>
                <p className="font-semibold">﷼{totalCard.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="font-semibold">﷼{grandTotal.toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">حالة الإرسال</p>
            <p className={`font-semibold text-sm ${allPosted ? 'text-emerald-600' : 'text-amber-600'}`}>
              {allPosted ? 'تم الإرسال ✅' : `${totalPosted}/${dayEntries.length} أُرسل`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
