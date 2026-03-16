import { supabase } from '@/integrations/supabase/client';

/**
 * Send in-app + ntfy notifications when a new B2B order is created.
 * Message format: "Hey you got 1 new order for ClientName: Item1 x5kg, Item2 x3pcs"
 * Fire-and-forget – errors are logged but never thrown.
 */
export async function notifyNewOrder(clientName: string, orderSummary?: string) {
  try {
    const title = 'طلب B2B جديد';
    const client = clientName || 'غير معروف';
    let message = `طلب جديد من ${client}`;
    if (orderSummary) message += ` — ${orderSummary}`;

    // In-app notifications for every user
    const { data: allProfiles } = await supabase.from('profiles_public').select('id');
    if (allProfiles && allProfiles.length > 0) {
      const notifications = allProfiles.map(profile => ({
        user_id: profile.id,
        title,
        message,
        is_read: false,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    // ntfy push (fire-and-forget)
    supabase.functions.invoke('send-ntfy', {
      body: { title, message, tags: 'package,moneybag' },
    }).catch(err => console.warn('ntfy notification failed:', err));
  } catch (err) {
    console.warn('Order notification failed:', err);
  }
}

/**
 * Build a detailed order summary from items_qty cell data.
 * Returns e.g. "Saffron x5kg, Honey x3pcs" or null if no items data.
 */
export function buildOrderSummary(cells: Record<string, any>, columns: { id: string; name: string; type: string }[]): string | undefined {
  const itemsCol = columns.find(c => c.type === 'items_qty');
  if (!itemsCol) return undefined;

  const itemsData = cells[itemsCol.id];
  if (!itemsData) return undefined;

  try {
    const items = typeof itemsData === 'string' ? JSON.parse(itemsData) : itemsData;
    if (!Array.isArray(items) || items.length === 0) return undefined;

    return items
      .map((item: any) => {
        const name = item.name || item.product || 'صنف';
        const qty = item.qty ?? item.quantity ?? '';
        const unit = item.unit || 'كجم';
        return `${name} ${qty}${unit}`;
      })
      .join('، ');
  } catch {
    return undefined;
  }
}
