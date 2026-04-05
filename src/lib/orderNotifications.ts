import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a client name from a relation cell value (could be UUID or plain text).
 */
export async function resolveClientName(cellValue: any): Promise<string> {
  if (!cellValue) return 'غير معروف';
  const val = String(cellValue).trim();
  if (!val) return 'غير معروف';

  // Check if it looks like a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) {
    const { data } = await supabase
      .from('clients')
      .select('name')
      .eq('id', val)
      .maybeSingle();
    return data?.name || 'غير معروف';
  }

  return val;
}

/**
 * Send in-app + ntfy notifications when a B2B order is created or moved.
 * Message: "[Client] — [Items summary]"
 */
export async function notifyNewOrder(
  clientName: string,
  statusName?: string,
  itemsSummary?: string
) {
  try {
    const title = 'طلب B2B جديد';
    const client = clientName || 'غير معروف';
    const items = itemsSummary || '';

    let message = `طلب جديد من ${client}`;
    if (statusName) message += ` — ${statusName}`;
    if (items) message += `\n${items}`;

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
