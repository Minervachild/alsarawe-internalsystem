import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePageAccess() {
  const { user, isAdmin } = useAuth();
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setAllowedPages(null);
      setIsLoaded(true);
      return;
    }

    // Admins always have full access
    if (isAdmin) {
      setAllowedPages(null); // null = all pages
      setIsLoaded(true);
      return;
    }

    const fetchAccess = async () => {
      const { data } = await supabase
        .from('user_page_access')
        .select('page')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        setAllowedPages(data.map((d: any) => d.page));
      } else {
        setAllowedPages(null); // null = all pages (no restrictions)
      }
      setIsLoaded(true);
    };

    fetchAccess();
  }, [user, isAdmin]);

  const canAccess = (page: string): boolean => {
    if (isAdmin) return true;
    if (allowedPages === null) return true; // No restrictions
    return allowedPages.includes(page);
  };

  return { canAccess, allowedPages, isLoaded };
}