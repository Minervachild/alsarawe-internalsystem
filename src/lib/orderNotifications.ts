import { supabase } from '@/integrations/supabase/client';

/**
 * Send in-app + ntfy notifications when a new B2B order is created.
 * Fire-and-forget – errors are logged but never thrown.
 */
export async function notifyNewOrder(clientName: string, orderSummary?: string) {
  try {
    const title = 'New B2B Order 🛒';
    const parts = [`New order from ${clientName || 'Unknown'}`];
    if (orderSummary) parts.push(orderSummary);
    const message = parts.join(' — ');

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
      body: { title, message, tags: 'package,new' },
    }).catch(err => console.warn('ntfy notification failed:', err));
  } catch (err) {
    console.warn('Order notification failed:', err);
  }
}

/**
 * Build a short order summary from items_qty cell data.
 * Returns e.g. "3 items, 150kg" or null if no items data.
 */
export function buildOrderSummary(cells: Record<string, any>, columns: { id: string; name: string; type: string }[]): string | undefined {
  // Look for items_qty column
  const itemsCol = columns.find(c => c.type === 'items_qty');
  if (!itemsCol) return undefined;

  const itemsData = cells[itemsCol.id];
  if (!itemsData) return undefined;

  try {
    const items = typeof itemsData === 'string' ? JSON.parse(itemsData) : itemsData;
    if (!Array.isArray(items) || items.length === 0) return undefined;

    const totalItems = items.length;
    const totalQty = items.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
    const unit = items[0]?.unit || 'pcs';

    return `${totalItems} item${totalItems > 1 ? 's' : ''}, ${totalQty}${unit}`;
  } catch {
    return undefined;
  }
}
