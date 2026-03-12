import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NTFY_URL = Deno.env.get('NTFY_URL');
    const NTFY_TOPIC = Deno.env.get('NTFY_TOPIC');

    if (!NTFY_URL) throw new Error('NTFY_URL is not configured');
    if (!NTFY_TOPIC) throw new Error('NTFY_TOPIC is not configured');

    const { title, message, priority, tags } = await req.json();

    if (!title) throw new Error('title is required');

    // Encode title to handle emojis/non-ASCII in HTTP headers
    const encodedTitle = encodeURIComponent(title);
    
    const ntfyResponse = await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': encodedTitle,
        'Priority': priority || 'default',
        'Tags': tags || 'bell',
        'X-Title-Encoding': 'url',
      },
      body: message || title,
    });

    if (!ntfyResponse.ok) {
      const errorText = await ntfyResponse.text();
      throw new Error(`ntfy API error [${ntfyResponse.status}]: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ntfy send error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
