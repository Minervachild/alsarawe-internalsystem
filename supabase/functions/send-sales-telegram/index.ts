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
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    if (!TELEGRAM_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is not configured');

    const { date, shift, branchName, employeeName, cashAmount, cardAmount, transactionCount } = await req.json();

    const total = Number(cashAmount) + Number(cardAmount);
    const shiftLabel = shift === 'morning' ? 'صباحي' : 'مسائي';

    const message = [
      `📊 *تسجيل مبيعات جديد*`,
      ``,
      `📅 التاريخ: ${date}`,
      `🔄 الفترة: ${shiftLabel}`,
      `🏪 الفرع: ${branchName || '-'}`,
      `👤 الموظف: ${employeeName || '-'}`,
      ``,
      `💵 نقدي: ${Number(cashAmount).toLocaleString()} ﷼`,
      `💳 بطاقة: ${Number(cardAmount).toLocaleString()} ﷼`,
      `📦 الإجمالي: ${total.toLocaleString()} ﷼`,
      `🧾 عدد العمليات: ${transactionCount}`,
    ].join('\n');

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Telegram API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Telegram send error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
