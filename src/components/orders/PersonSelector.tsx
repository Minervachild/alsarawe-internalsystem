import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  avatar_color: string;
}

interface PersonSelectorProps {
  value: string | string[] | null;
  employees: Employee[];
  onChange: (value: string | string[]) => void;
  onAddEmployee?: (name: string) => Promise<Employee | null>;
  multiSelect?: boolean;
}

export function PersonSelector({
  value,
  employees,
  onChange,
  onAddEmployee,
  multiSelect = false,
}: PersonSelectorProps) {
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignedEmployees: string[] = Array.isArray(value) 
    ? value 
    : value ? [value] : [];

  const handleAddNewEmployee = async () => {
    if (!newEmployeeName.trim() || !onAddEmployee) return;
    
    setIsSubmitting(true);
    try {
      const newEmployee = await onAddEmployee(newEmployeeName.trim());
      if (newEmployee) {
        // Auto-assign the new employee
        if (multiSelect) {
          onChange([...assignedEmployees, newEmployee.name]);
        } else {
          onChange(newEmployee.name);
        }
      }
      setNewEmployeeName('');
      setIsAddingEmployee(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectEmployee = (empName: string) => {
    if (empName === '__add_new__') {
      setIsAddingEmployee(true);
      return;
    }

    if (multiSelect) {
      if (assignedEmployees.includes(empName)) {
        onChange(assignedEmployees.filter(e => e !== empName));
      } else {
        onChange([...assignedEmployees, empName]);
      }
    } else {
      onChange(empName);
    }
  };

  const handleRemoveEmployee = (empName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiSelect) {
      onChange(assignedEmployees.filter(e => e !== empName));
    } else {
      onChange('');
    }
  };

  // Show assigned avatars
  if (assignedEmployees.length > 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer">
            {assignedEmployees.slice(0, 3).map((empId, idx) => {
              const emp = employees.find(e => e.id === empId || e.name === empId);
              if (!emp) return null;
              return (
                <span
                  key={idx}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white relative group"
                  style={{ backgroundColor: emp.avatar_color || '#8B4513' }}
                  title={emp.name}
                >
                  {emp.name.substring(0, 2).toUpperCase()}
                </span>
              );
            })}
            {assignedEmployees.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{assignedEmployees.length - 3}
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Assigned</p>
            {assignedEmployees.map((empId, idx) => {
              const emp = employees.find(e => e.id === empId || e.name === empId);
              if (!emp) return null;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-1 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: emp.avatar_color || '#8B4513' }}
                    >
                      {emp.name.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="text-sm">{emp.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => handleRemoveEmployee(empId, e)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
            <div className="pt-2 border-t">
              <Select onValueChange={handleSelectEmployee}>
                <SelectTrigger className="h-8 text-sm">
                  <span className="text-muted-foreground">Add more...</span>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {employees
                    .filter(e => !assignedEmployees.includes(e.name) && !assignedEmployees.includes(e.id))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.name}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: emp.avatar_color || '#8B4513' }}
                          >
                            {emp.name.substring(0, 2).toUpperCase()}
                          </span>
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  {onAddEmployee && (
                    <SelectItem value="__add_new__">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Plus className="w-3 h-3" />
                        Add new employee
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // No employees assigned - show select
  return (
    <div className="flex items-center gap-1">
      <Select onValueChange={handleSelectEmployee}>
        <SelectTrigger className="h-7 text-sm border-0 bg-transparent hover:bg-muted/50 w-auto">
          <span className="text-muted-foreground">Assign</span>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.name}>
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: emp.avatar_color || '#8B4513' }}
                >
                  {emp.name.substring(0, 2).toUpperCase()}
                </span>
                {emp.name}
              </div>
            </SelectItem>
          ))}
          {onAddEmployee && (
            <SelectItem value="__add_new__">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Plus className="w-3 h-3" />
                Add new employee
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Add employee popover */}
      {isAddingEmployee && (
        <Popover open onOpenChange={(open) => !open && setIsAddingEmployee(false)}>
          <PopoverTrigger asChild>
            <span />
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">New Employee</p>
              <Input
                placeholder="Employee name"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewEmployee();
                  }
                }}
                autoFocus
                className="h-8"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsAddingEmployee(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddNewEmployee}
                  disabled={!newEmployeeName.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
