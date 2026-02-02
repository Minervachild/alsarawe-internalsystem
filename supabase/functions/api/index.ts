import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify API key from header
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate API key against profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path format: /api/{resource}/{action?}/{id?}
  const resource = pathParts[1] || '';
  const action = pathParts[2] || '';
  const resourceId = pathParts[3] || '';

  try {
    // ===== B2B ORDERS =====
    if (resource === 'orders') {
      if (req.method === 'GET') {
        // Get all orders (rows with cells)
        const { data: rows, error } = await supabase
          .from('board_rows')
          .select(`
            id, position, created_at, group_id,
            board_groups!inner(id, name, color),
            board_cells(id, column_id, value)
          `)
          .order('position');

        if (error) throw error;

        // Get columns for reference
        const { data: columns } = await supabase
          .from('board_columns')
          .select('id, name, type, position')
          .order('position');

        // Transform rows to include cell values by column name
        const orders = (rows || []).map((row: any) => {
          const orderData: any = {
            id: row.id,
            group: row.board_groups?.name,
            group_id: row.group_id,
            created_at: row.created_at,
          };

          (row.board_cells || []).forEach((cell: any) => {
            const column = columns?.find((c: any) => c.id === cell.column_id);
            if (column) {
              orderData[column.name.toLowerCase().replace(/\s+/g, '_')] = cell.value;
            }
          });

          return orderData;
        });

        return new Response(JSON.stringify({ success: true, data: orders, columns }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'POST') {
        const body = await req.json();
        const { group_id, cells } = body;

        if (!group_id) {
          return new Response(JSON.stringify({ error: 'group_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get max position
        const { data: existingRows } = await supabase
          .from('board_rows')
          .select('position')
          .eq('group_id', group_id)
          .order('position', { ascending: false })
          .limit(1);

        const newPosition = (existingRows?.[0]?.position ?? -1) + 1;

        // Create row
        const { data: newRow, error: rowError } = await supabase
          .from('board_rows')
          .insert({ group_id, position: newPosition })
          .select()
          .single();

        if (rowError) throw rowError;

        // Create cells if provided
        if (cells && Array.isArray(cells)) {
          const cellInserts = cells.map((cell: any) => ({
            row_id: newRow.id,
            column_id: cell.column_id,
            value: cell.value,
          }));

          const { error: cellError } = await supabase
            .from('board_cells')
            .insert(cellInserts);

          if (cellError) throw cellError;
        }

        return new Response(JSON.stringify({ success: true, data: newRow }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'PATCH' && action) {
        const orderId = action;
        const body = await req.json();
        const { cells, group_id } = body;

        // Update group if provided
        if (group_id) {
          await supabase
            .from('board_rows')
            .update({ group_id })
            .eq('id', orderId);
        }

        // Update cells
        if (cells && Array.isArray(cells)) {
          for (const cell of cells) {
            await supabase
              .from('board_cells')
              .upsert({
                row_id: orderId,
                column_id: cell.column_id,
                value: cell.value,
              }, { onConflict: 'row_id,column_id' });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'DELETE' && action) {
        const orderId = action;
        const { error } = await supabase
          .from('board_rows')
          .delete()
          .eq('id', orderId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== OVERTIME =====
    if (resource === 'overtime') {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('overtime')
          .select(`
            id, employee_id, date, hours, amount, is_paid, created_at,
            employees!inner(id, name, hourly_rate)
          `)
          .order('date', { ascending: false });

        if (error) throw error;

        const overtime = (data || []).map((o: any) => ({
          ...o,
          employee_name: o.employees?.name,
          hourly_rate: o.employees?.hourly_rate,
        }));

        return new Response(JSON.stringify({ success: true, data: overtime }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'POST') {
        const body = await req.json();
        const { employee_id, date, hours, amount, is_paid } = body;

        if (!employee_id || hours === undefined || amount === undefined) {
          return new Response(JSON.stringify({ error: 'employee_id, hours, and amount are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('overtime')
          .insert({ 
            employee_id, 
            date: date || new Date().toISOString().split('T')[0],
            hours, 
            amount,
            is_paid: is_paid || false,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, data }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'PATCH' && action) {
        const overtimeId = action;
        const body = await req.json();

        const { error } = await supabase
          .from('overtime')
          .update(body)
          .eq('id', overtimeId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== ATTENDANCE =====
    if (resource === 'attendance') {
      if (req.method === 'GET') {
        const dateFilter = url.searchParams.get('date');
        const employeeFilter = url.searchParams.get('employee_id');
        
        let query = supabase
          .from('shift_attendance')
          .select(`
            id, employee_id, shift_type, scheduled_start, scheduled_end,
            check_in_time, check_out_time, is_on_time, date, notes,
            employees!inner(id, name)
          `)
          .order('date', { ascending: false });

        if (dateFilter) {
          query = query.eq('date', dateFilter);
        }
        if (employeeFilter) {
          query = query.eq('employee_id', employeeFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const attendance = (data || []).map((a: any) => ({
          ...a,
          employee_name: a.employees?.name,
        }));

        return new Response(JSON.stringify({ success: true, data: attendance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'POST') {
        const body = await req.json();
        const { employee_id, shift_type, scheduled_start, scheduled_end, check_in_time, date } = body;

        if (!employee_id || !shift_type) {
          return new Response(JSON.stringify({ error: 'employee_id and shift_type are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Calculate if on time
        const now = check_in_time ? new Date(check_in_time) : new Date();
        const [startHour, startMin] = (scheduled_start || '08:00').split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(startHour, startMin, 0, 0);
        const isOnTime = now <= new Date(scheduledTime.getTime() + 15 * 60 * 1000);

        const { data, error } = await supabase
          .from('shift_attendance')
          .upsert({
            employee_id,
            date: date || new Date().toISOString().split('T')[0],
            shift_type,
            scheduled_start: scheduled_start || '08:00',
            scheduled_end: scheduled_end || '16:00',
            check_in_time: check_in_time || now.toISOString(),
            is_on_time: isOnTime,
          }, { onConflict: 'employee_id,date,shift_type' })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, data }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'PATCH' && action) {
        const attendanceId = action;
        const body = await req.json();

        const { error } = await supabase
          .from('shift_attendance')
          .update(body)
          .eq('id', attendanceId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== EMPLOYEES (read-only for reference) =====
    if (resource === 'employees' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, hourly_rate, shift_type, shift_start, shift_end')
        .order('name');

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GROUPS (for order status) =====
    if (resource === 'groups' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('board_groups')
        .select('id, name, color, position')
        .order('position');

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: 'Not found', available_endpoints: [
      'GET/POST /api/orders',
      'PATCH/DELETE /api/orders/{id}',
      'GET/POST /api/overtime',
      'PATCH /api/overtime/{id}',
      'GET/POST /api/attendance',
      'PATCH /api/attendance/{id}',
      'GET /api/employees',
      'GET /api/groups',
    ] }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
