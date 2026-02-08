import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  shift_type: string;
  scheduled_start: string;
  scheduled_end: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_on_time: boolean | null;
  date: string;
}

interface DutyCompletion {
  employee_id: string;
  rating: number;
  completed_at: string;
}

export function AttendanceHistory() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dutyCompletions, setDutyCompletions] = useState<DutyCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      const [attendanceRes, completionsRes] = await Promise.all([
        supabase
          .from('shift_attendance')
          .select(`
            id,
            employee_id,
            shift_type,
            scheduled_start,
            scheduled_end,
            check_in_time,
            check_out_time,
            is_on_time,
            date,
            employees!inner(name)
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('duty_completions')
          .select('employee_id, rating, completed_at')
          .gte('completed_at', `${startDate}T00:00:00`)
          .lte('completed_at', `${endDate}T23:59:59`),
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (completionsRes.error) throw completionsRes.error;

      const records = (attendanceRes.data || []).map((a: any) => ({
        ...a,
        employee_name: a.employees?.name || 'Unknown',
      }));

      setAttendance(records);
      setDutyCompletions(completionsRes.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getAverageRating = (employeeId: string, date: string) => {
    const dayCompletions = dutyCompletions.filter(
      (c) => c.employee_id === employeeId && c.completed_at.startsWith(date)
    );
    if (dayCompletions.length === 0) return null;
    const avg = dayCompletions.reduce((sum, c) => sum + c.rating, 0) / dayCompletions.length;
    return avg;
  };

  const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <h3 className="font-semibold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <p className="text-sm text-muted-foreground">Attendance & Performance</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-premium p-4 text-center">
          <div className="text-2xl font-semibold text-success">
            {attendance.filter((a) => a.is_on_time).length}
          </div>
          <p className="text-sm text-muted-foreground">On Time</p>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-2xl font-semibold text-warning">
            {attendance.filter((a) => a.is_on_time === false).length}
          </div>
          <p className="text-sm text-muted-foreground">Late</p>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-2xl font-semibold text-primary">
            {attendance.length}
          </div>
          <p className="text-sm text-muted-foreground">Total Shifts</p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card-premium overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No attendance records for this week.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duty Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => {
                const avgRating = getAverageRating(record.employee_id, record.date);
                const duration = calculateDuration(record.check_in_time, record.check_out_time);

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {(() => {
                        const [year, month, day] = record.date.split('-').map(Number);
                        return format(new Date(year, month - 1, day), 'EEE, MMM d');
                      })()}
                    </TableCell>
                    <TableCell>{record.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {record.shift_type} Shift
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.check_in_time
                        ? format(new Date(record.check_in_time), 'h:mm a')
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell>
                      {record.check_out_time
                        ? format(new Date(record.check_out_time), 'h:mm a')
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell>
                      {duration || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {record.is_on_time === true ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">On Time</span>
                        </div>
                      ) : record.is_on_time === false ? (
                        <div className="flex items-center gap-1 text-warning">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Late</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {avgRating !== null ? (
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${avgRating >= 4 ? 'text-success' : avgRating >= 3 ? 'text-warning' : 'text-destructive'}`} />
                          <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
