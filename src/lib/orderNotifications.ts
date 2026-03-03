import { supabase } from '@/integrations/supabase/client';

/**
 * Send in-app + ntfy notifications when a new B2B order is created.
 * Fire-and-forget – errors are logged but never thrown.
 */
export async function notifyNewOrder(clientName: string) {
  try {
    const title = 'New B2B Order';
    const message = `New order from ${clientName || 'Unknown'} has been added.`;

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
