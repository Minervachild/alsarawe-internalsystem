import { supabase } from '@/integrations/supabase/client';

/**
 * Send in-app + ntfy notifications when a B2B order is created or moved.
 * Message format: "طلب جديد من [Client] — [Status]"
 * Fire-and-forget – errors are logged but never thrown.
 */
export async function notifyNewOrder(clientName: string, statusName?: string) {
  try {
    const title = 'طلب B2B جديد';
    const client = clientName || 'غير معروف';
    const status = statusName || '';
    const message = status
      ? `طلب جديد من ${client} — ${status}`
      : `طلب جديد من ${client}`;

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
