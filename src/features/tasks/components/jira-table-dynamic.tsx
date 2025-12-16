"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, MoreVertical, Eye, EyeOff, Trash2, Settings, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { TaskActions } from "./task-actions";
import { Task, TaskStatus, TaskPriority } from "../types";
import { TaskDetailsDrawer } from "./task-details-drawer";
import { useGetListViewColumns, ListViewColumn, useCreateListViewColumn, useDeleteListViewColumn, useUpdateListViewColumn } from "../api/use-list-view-columns";
import { useUpdateTask } from "../api/use-update-task";
import { useCreateTask } from "../api/use-create-task";
import { useDeleteTask } from "../api/use-delete-task";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { MemberRole } from "@/features/members/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface JiraTableProps {
  data: Task[];
  workspaceId: string;
  onAddSubtask?: (parentTaskId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  "Low": "bg-blue-100 text-blue-800",
  "Medium": "bg-yellow-100 text-yellow-800",
  "High": "bg-orange-100 text-orange-800",
  "Critical": "bg-red-100 text-red-800",
};

export function JiraTableDynamic({ data, workspaceId, onAddSubtask }: JiraTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [displayLimit, setDisplayLimit] = useState(50);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{taskId: string, fieldName: string} | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [creatingSubtaskForId, setCreatingSubtaskForId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  const { data: listViewColumns, isLoading } = useGetListViewColumns(workspaceId);
  const createColumn = useCreateListViewColumn();
  const deleteColumn = useDeleteListViewColumn();
  const updateColumn = useUpdateListViewColumn();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const { data: members } = useGetMembers({ workspaceId });
  
  // Get current user role for permissions
  const { data: roleData } = useGetCurrentUserRole();
  const isAdmin = !!(roleData && [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(roleData.role as MemberRole));

  // Update selectedTask when data changes to reflect latest updates
  useEffect(() => {
    if (selectedTask && data) {
      const updatedTask = data.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [data, selectedTask?.id]);

  // Listen for custom event to open subtask details
  useEffect(() => {
    const handleOpenTaskDetails = (event: CustomEvent) => {
      const { task } = event.detail;
      if (task) {
        setSelectedTask(task);
        setIsDrawerOpen(true);
      }
    };

    window.addEventListener('openTaskDetails' as any, handleOpenTaskDetails);
    return () => {
      window.removeEventListener('openTaskDetails' as any, handleOpenTaskDetails);
    };
  }, []);

  // Filter visible columns and sort by position
  const visibleColumns = (listViewColumns || [])
    .filter(col => col.isVisible)
    .sort((a, b) => a.position - b.position);


  // Organize tasks into parent-child hierarchy
  const { parentTasks, childrenMap } = organizeTaskHierarchy(data);
  
  console.log('📊 Raw Data Check:', {
    totalTasks: data.length,
    firstFewTasks: data.slice(0, 5).map(t => ({
      id: t.id.slice(0, 8) + '...',
      issueId: t.issueId,
      summary: t.summary?.slice(0, 30),
      parentTaskId: t.parentTaskId ? t.parentTaskId.slice(0, 8) + '...' : 'NULL/UNDEFINED/EMPTY',
      parentTaskIdType: typeof t.parentTaskId,
      parentTaskIdValue: JSON.stringify(t.parentTaskId)
    }))
  });
  
  console.log('📊 Data summary:', {
    totalTasks: data.length,
    parentTasks: parentTasks.length,
    tasksWithParentId: data.filter(t => t.parentTaskId).length,
    sampleTasksWithParent: data.filter(t => t.parentTaskId).slice(0, 3).map(t => ({
      issueId: t.issueId,
      summary: t.summary,
      parentTaskId: t.parentTaskId
    })),
    childrenMapSize: childrenMap.size,
    childrenByParent: Array.from(childrenMap.entries()).map(([parentId, children]) => ({
      parentId,
      childCount: children.length,
      childIds: children.map(c => c.issueId)
    }))
  });
  
  // Limit displayed tasks for performance
  const displayedParentTasks = parentTasks.slice(0, displayLimit);
  const hasMore = parentTasks.length > displayLimit;


  const toggleRow = (taskId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    
    createColumn.mutate({
      workspaceId: workspaceId,
      fieldName: newColumnName.toLowerCase().replace(/\s+/g, '_'),
      displayName: newColumnName,
      columnType: 'text' as const,
      width: 150,
      isVisible: true,
    }, {
      onSuccess: () => {
        setNewColumnName("");
        setIsAddingColumn(false);
      }
    });
  };

  const handleToggleColumnVisibility = (column: ListViewColumn) => {
    updateColumn.mutate({
      id: column.id,
      workspaceId: workspaceId,
      updates: {
        isVisible: !column.isVisible
      }
    });
  };

  const handleDeleteColumn = (column: ListViewColumn) => {
    if (column.isSystem) return;
    if (confirm(`Delete column "${column.displayName}"?`)) {
      deleteColumn.mutate({
        id: column.id,
        workspaceId: workspaceId
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(new Set(displayedParentTasks.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTaskIds);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    // Delete each selected task
    selectedTaskIds.forEach((taskId) => {
      deleteTask.mutate({ param: { taskId } });
    });

    // Clear selection
    setSelectedTaskIds(new Set());
  };

  const handleBulkEdit = () => {
    if (selectedTaskIds.size === 0) return;
    
    // Get the first selected task and open it for editing
    const firstTaskId = Array.from(selectedTaskIds)[0];
    const firstTask = data.find(t => t.id === firstTaskId);
    
    if (firstTask) {
      setSelectedTask(firstTask);
      setIsDrawerOpen(true);
    }
  };

  const handleCreateInlineSubtask = (parentTaskId: string, parentTask: Task) => {
    if (!newSubtaskTitle.trim()) return;

    console.log('🔨 Creating subtask:', {
      title: newSubtaskTitle,
      parentTaskId,
      parentIssueId: parentTask.issueId,
      parentProjectId: parentTask.projectId,
      parentWorkspaceId: parentTask.workspaceId
    });

    createTask.mutate({
      json: {
        summary: newSubtaskTitle,
        status: "To Do" as any,
        priority: "Medium" as any,
        parentTaskId: parentTaskId,
        projectId: parentTask.projectId || undefined,
        workspaceId: parentTask.workspaceId || undefined,
      }
    }, {
      onSuccess: (response) => {
        console.log('✅ Subtask created:', response);
        setNewSubtaskTitle("");
        setCreatingSubtaskForId(null);
        // Auto-expand parent to show the newly created subtask
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.add(parentTaskId);
          console.log('📂 Expanded rows after creation:', Array.from(next));
          return next;
        });
        // Open the newly created subtask in the drawer
        if (response && response.data) {
          setSelectedTask(response.data as any);
          setIsDrawerOpen(true);
        }
      }
    });
  };

  const handleCellClick = useCallback((task: Task, column: ListViewColumn, e: React.MouseEvent) => {
    e.stopPropagation();
    if (column.fieldName === 'issueId' || !column.fieldName) return; // Don't edit issue ID
    
    // Only allow admins to edit cells inline
    if (!isAdmin) {
      console.log('🚫 Inline editing disabled for non-admin users');
      return;
    }
    
    console.log('🖱️ Cell clicked:', { taskId: task.id, field: column.fieldName, taskSummary: task.summary?.slice(0, 30) });
    setEditingCell({ taskId: task.id, fieldName: column.fieldName });
    
    // Handle labels field - convert array to comma-separated string for editing
    if (column.fieldName === 'labels') {
      const currentValue = (task as any)[column.fieldName];
      const labelsString = Array.isArray(currentValue) ? currentValue.join(', ') : '';
      setEditValue(labelsString);
    } else {
      const currentValue = (task as any)[column.fieldName];
      setEditValue(currentValue || "");
    }
  }, [isAdmin]);

  const handleCellUpdate = useCallback((task: Task, fieldName: string, value: any) => {
    console.log('📝 Updating task:', {
      taskId: task.id,
      taskSummary: task.summary?.slice(0, 30),
      fieldName,
      oldValue: (task as any)[fieldName],
      newValue: value
    });
    
    // Check if this is a custom field (not a standard task field)
    const standardFields = ['summary', 'issueId', 'issueType', 'status', 'priority', 'assigneeId', 'dueDate', 'labels', 'description'];
    const isCustomField = !standardFields.includes(fieldName);
    
    if (isCustomField) {
      // Update custom field in the customFields JSON object
      const customFields = task.customFields && typeof task.customFields === 'object' ? { ...(task.customFields as any) } : {};
      customFields[fieldName] = value;
      
      updateTask.mutate({
        json: {
          customFields: customFields
        },
        param: { taskId: task.id }
      }, {
        onSuccess: (data) => {
          console.log('✅ Custom field update successful:', data);
        },
        onError: (error) => {
          console.error('❌ Custom field update failed:', error);
        }
      });
    } else {
      // Update standard field
      updateTask.mutate({
        json: {
          [fieldName]: value
        },
        param: { taskId: task.id }
      }, {
        onSuccess: (data) => {
          console.log('✅ Update successful:', data);
        },
        onError: (error) => {
          console.error('❌ Update failed:', error);
        }
      });
    }
    
    setEditingCell(null);
    setEditValue("");
  }, [updateTask]);

  const handleCellBlur = useCallback((task: Task, fieldName: string) => {
    if (editValue !== (task as any)[fieldName]) {
      console.log('💾 Saving on blur:', { taskId: task.id, fieldName, oldValue: (task as any)[fieldName], newValue: editValue });
      handleCellUpdate(task, fieldName, editValue);
    } else {
      console.log('⏭️ No changes, canceling edit');
      setEditingCell(null);
      setEditValue("");
    }
  }, [editValue, handleCellUpdate]);

  // Render cell content based on column type - Memoized for performance
  const renderCell = useCallback((task: Task, column: ListViewColumn, onCellClick?: (e: React.MouseEvent) => void) => {
    // Try to get value from standard fields first, then from customFields
    let value = (task as any)[column.fieldName];
    
    // If not found in standard fields and task has customFields, check there
    if (value === undefined && task.customFields && typeof task.customFields === 'object') {
      const customFieldsObj = task.customFields as { [key: string]: any };
      value = customFieldsObj[column.displayName] || customFieldsObj[column.fieldName];
    }
    
    const isEditing = editingCell?.taskId === task.id && editingCell?.fieldName === column.fieldName;
    const cursorClass = isAdmin && column.fieldName !== 'issueId' ? 'cursor-pointer' : '';

    // Editing state for text fields
    if (isEditing && (column.columnType === 'text' && column.fieldName !== 'issueId')) {
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellBlur(task, column.fieldName)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellUpdate(task, column.fieldName, editValue);
            }
            if (e.key === 'Escape') {
              setEditingCell(null);
              setEditValue("");
            }
          }}
          className="h-6 text-xs"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    switch (column.columnType) {
      case 'user':
        if (column.fieldName === 'assigneeId') {
          if (isEditing) {
            return (
              <Select
                value={value || ""}
                onValueChange={(newValue) => handleCellUpdate(task, column.fieldName, newValue)}
                onOpenChange={(open) => {
                  if (!open) setEditingCell(null);
                }}
              >
                <SelectTrigger className="h-6 text-xs" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members?.documents?.map((member: any) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={member.name} className="size-4" />
                        <span>{member.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          if (task.assignee) {
            return (
              <div className={`flex items-center gap-2 ${cursorClass}`} onClick={onCellClick}>
                <MemberAvatar name={task.assignee.name} className="size-6" />
                <span className="text-xs">{task.assignee.name}</span>
              </div>
            );
          }
          return <span className={`text-xs text-muted-foreground ${cursorClass}`} onClick={onCellClick}>-</span>;
        }
        if (column.fieldName === 'reporterId' && task.reporter) {
          return (
            <div className="flex items-center gap-2">
              <MemberAvatar name={task.reporter.name} className="size-6" />
              <span className="text-xs">{task.reporter.name}</span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">-</span>;

      case 'date':
        if (isEditing) {
          return (
            <Popover
              open={true}
              onOpenChange={(open) => {
                if (!open) setEditingCell(null);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs justify-start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {value ? format(new Date(value), "MMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleCellUpdate(task, column.fieldName, date.toISOString());
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          );
        }
        if (!value) return <span className={`text-xs text-muted-foreground ${cursorClass}`} onClick={onCellClick}>-</span>;
        const date = new Date(value);
        return <span className={`text-xs ${cursorClass}`} onClick={onCellClick}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>;

      case 'priority':
        if (isEditing) {
          return (
            <Select
              value={value || 'Medium'}
              onValueChange={(newValue) => handleCellUpdate(task, column.fieldName, newValue)}
              onOpenChange={(open) => {
                if (!open) setEditingCell(null);
              }}
            >
              <SelectTrigger className="h-6 text-xs" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge 
            variant="outline" 
            className={`text-xs ${cursorClass} ${PRIORITY_COLORS[value || 'Medium']}`}
            onClick={onCellClick}
          >
            {value || 'Medium'}
          </Badge>
        );

      case 'select':
        if (column.fieldName === 'status') {
          if (isEditing) {
            return (
              <Select
                value={value || "To Do"}
                onValueChange={(newValue) => {
                  console.log('Status change:', { taskId: task.id, oldValue: value, newValue });
                  handleCellUpdate(task, column.fieldName, newValue);
                }}
                onOpenChange={(open) => {
                  if (!open) setEditingCell(null);
                }}
              >
                <SelectTrigger className="h-6 text-xs" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            );
          }
          return <Badge variant="secondary" className={`text-xs ${cursorClass}`} onClick={onCellClick}>{value}</Badge>;
        }
        if (column.fieldName === 'issueType') {
          return <Badge variant="outline" className="text-xs">{value}</Badge>;
        }
        return <span className="text-xs cursor-pointer" onClick={onCellClick}>{value || '-'}</span>;

      case 'labels':
        // Check if this cell is being edited
        if (editingCell?.taskId === task.id && editingCell?.fieldName === column.fieldName) {
          return (
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                const labelsArray = editValue.split(',').map(l => l.trim()).filter(l => l);
                handleCellUpdate(task, column.fieldName, labelsArray);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const labelsArray = editValue.split(',').map(l => l.trim()).filter(l => l);
                  handleCellUpdate(task, column.fieldName, labelsArray);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                  setEditValue("");
                }
              }}
              placeholder="Enter labels (comma-separated)"
              className="h-8 text-xs"
            />
          );
        }
        
        // Display mode
        if (!value || !Array.isArray(value) || value.length === 0) {
          return <span className="text-xs text-muted-foreground cursor-pointer" onClick={onCellClick}>-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 cursor-pointer" onClick={onCellClick}>
            {value.slice(0, 2).map((label, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
            {value.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{value.length - 2}
              </Badge>
            )}
          </div>
        );

      case 'text':
      default:
        if (column.fieldName === 'issueId') {
          return <span className="text-xs font-medium">{value || '-'}</span>;
        }
        if (column.fieldName === 'summary') {
          return (
            <span className="text-xs cursor-pointer block truncate" onClick={onCellClick} title={value}>
              {value || '-'}
            </span>
          );
        }
        return <span className="text-xs cursor-pointer" onClick={onCellClick}>{value || '-'}</span>;
    }
  }, [editingCell, editValue, members, handleCellUpdate, isAdmin]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading columns...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedTaskIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEdit}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <div className="min-w-[1200px]">{/* Ensure minimum width for proper layout */}
        {/* Header */}
        <div className="bg-muted/50 border-b">
          <div className="flex items-center min-w-max">
            {/* Checkbox column */}
            <div className="w-12 px-4 py-3 flex items-center justify-center flex-shrink-0">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={selectedTaskIds.size === displayedParentTasks.length && displayedParentTasks.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </div>

            {/* Dynamic columns */}
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                className="px-4 py-3 text-xs font-medium text-muted-foreground flex items-center gap-2 flex-shrink-0"
                style={{ width: column.fieldName === 'issueId' ? `${Math.max(column.width, 180)}px` : `${column.width}px` }}
              >
                <span>{column.displayName}</span>
              </div>
            ))}

            {/* Actions column */}
            <div className="w-20 px-4 py-3 text-xs font-medium text-muted-foreground flex-shrink-0">
              Actions
            </div>

            {/* Column Management Dropdown - Admin only */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    <Settings className="h-3 w-3" />
                    <span>Columns</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>Manage Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(listViewColumns || []).map((column) => (
                    <div key={column.id} className="flex items-center justify-between gap-2 px-2">
                      <DropdownMenuCheckboxItem
                        checked={column.isVisible}
                        onCheckedChange={() => handleToggleColumnVisibility(column)}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="truncate">{column.displayName}</span>
                      </DropdownMenuCheckboxItem>
                      {!column.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColumn(column);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add Column button/input - Admin only */}
            {isAdmin && (
              !isAddingColumn ? (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add column</span>
                </button>
              ) : (
                <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    className="h-7 w-32 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddColumn();
                      }
                      if (e.key === 'Escape') {
                        setIsAddingColumn(false);
                        setNewColumnName("");
                      }
                    }}
                    onBlur={() => {
                      if (newColumnName.trim()) {
                        handleAddColumn();
                      } else {
                        setIsAddingColumn(false);
                      }
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Body */}
        <div className="divide-y">
          {displayedParentTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <>
              {displayedParentTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  level={0}
                  childrenMap={childrenMap}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                  onAddSubtask={onAddSubtask}
                  onTaskClick={handleTaskClick}
                  visibleColumns={visibleColumns}
                  renderCell={renderCell}
                  isSelected={selectedTaskIds.has(task.id)}
                  onSelectTask={handleSelectTask}
                  onCellClick={handleCellClick}
                  hoveredTaskId={hoveredTaskId}
                  setHoveredTaskId={setHoveredTaskId}
                  creatingSubtaskForId={creatingSubtaskForId}
                  setCreatingSubtaskForId={setCreatingSubtaskForId}
                  newSubtaskTitle={newSubtaskTitle}
                  setNewSubtaskTitle={setNewSubtaskTitle}
                  onCreateInlineSubtask={handleCreateInlineSubtask}
                  selectedTaskIds={selectedTaskIds}
                  isAdmin={isAdmin}
                />
              ))}
              {hasMore && (
                <div className="px-4 py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                  >
                    Load More ({parentTasks.length - displayLimit} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
          </div>
        </div>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        task={selectedTask}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  level: number;
  childrenMap: Map<string, Task[]>;
  expandedRows: Set<string>;
  toggleRow: (taskId: string) => void;
  onAddSubtask?: (parentTaskId: string) => void;
  onTaskClick: (task: Task) => void;
  visibleColumns: ListViewColumn[];
  renderCell: (task: Task, column: ListViewColumn, onCellClick?: (e: React.MouseEvent) => void) => React.ReactNode;
  isSelected: boolean;
  onSelectTask: (taskId: string, checked: boolean) => void;
  onCellClick: (task: Task, column: ListViewColumn, e: React.MouseEvent) => void;
  hoveredTaskId: string | null;
  setHoveredTaskId: (id: string | null) => void;
  creatingSubtaskForId: string | null;
  setCreatingSubtaskForId: (id: string | null) => void;
  newSubtaskTitle: string;
  setNewSubtaskTitle: (title: string) => void;
  onCreateInlineSubtask: (parentTaskId: string, parentTask: Task) => void;
  selectedTaskIds: Set<string>;
  isAdmin: boolean;
}

const TaskRow = memo(function TaskRow({
  task,
  level,
  childrenMap,
  expandedRows,
  toggleRow,
  onAddSubtask,
  onTaskClick,
  visibleColumns,
  renderCell,
  isSelected,
  onSelectTask,
  onCellClick,
  hoveredTaskId,
  setHoveredTaskId,
  creatingSubtaskForId,
  setCreatingSubtaskForId,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onCreateInlineSubtask,
  selectedTaskIds,
  isAdmin,
}: TaskRowProps) {
  const children = childrenMap.get(task.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedRows.has(task.id);

  return (
    <>
      {/* Parent Row */}
      <div
        className={cn(
          "group flex items-center min-w-max transition-colors cursor-pointer",
          level > 0 && "bg-muted/20",
          hoveredTaskId === task.id ? "bg-accent" : "hover:bg-muted/40"
        )}
        onClick={() => onTaskClick(task)}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => setHoveredTaskId(null)}
      >
        {/* Checkbox */}
        <div className="w-12 px-4 py-2.5 flex items-center justify-center flex-shrink-0">
          <input 
            type="checkbox" 
            className="rounded" 
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelectTask(task.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Dynamic columns */}
        {visibleColumns.map((column, index) => (
          <div
            key={column.id}
            className="px-4 py-2.5 flex items-center flex-shrink-0"
            style={{ width: column.fieldName === 'issueId' ? `${Math.max(column.width, 180)}px` : `${column.width}px` }}
          >
            {/* Special handling for issueId column with expand/collapse chevron */}
            {index === 0 && column.fieldName === 'issueId' ? (
              <div className="flex items-center gap-1 w-full overflow-visible">
                {/* Indentation spacer for hierarchy */}
                {level > 0 && <div className="w-4 flex-shrink-0" />}
                {level > 1 && <div className="w-4 flex-shrink-0" />}
                {level > 2 && <div className="w-4 flex-shrink-0" />}
                
                {/* Subtask arrow indicator */}
                {level > 0 && (
                  <span className="text-muted-foreground/50 text-xs flex-shrink-0">→</span>
                )}
                
                {/* Expand/collapse chevron or spacer */}
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(task.id);
                    }}
                    className="hover:bg-accent rounded p-0.5 transition-colors flex-shrink-0"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  <div className="w-5 flex-shrink-0" />
                )}
                
                {/* Issue ID */}
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap flex-shrink-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 cursor-pointer",
                  level > 0 && "text-blue-600 dark:text-blue-400"
                )}>
                  {task.issueId}
                </span>
              </div>
            ) : column.fieldName === 'summary' ? (
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="flex-1 min-w-0 truncate">
                  {renderCell(task, column, (e) => onCellClick(task, column, e))}
                </div>
                {hoveredTaskId === task.id && isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatingSubtaskForId(task.id);
                    }}
                    className="hover:bg-accent rounded p-1 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Add subtask"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            ) : (
              renderCell(task, column, (e) => onCellClick(task, column, e))
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="w-20 px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
          <TaskActions id={task.id} projectId={task.projectId ?? null}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </TaskActions>
        </div>
      </div>

      {/* Inline Subtask Creation Row */}
      {creatingSubtaskForId === task.id && (
        <div className="flex items-center min-w-max bg-accent/50">
          <div className="w-12 px-4 py-2.5 flex-shrink-0" />
          {visibleColumns.map((column, index) => (
            <div
              key={column.id}
              className="px-4 py-2.5 flex items-center flex-shrink-0"
              style={{ width: column.fieldName === 'issueId' ? `${Math.max(column.width, 180)}px` : `${column.width}px` }}
            >
              {index === 0 && column.fieldName === 'issueId' ? (
                <div className="flex items-center gap-1">
                  {/* Match parent indentation + one more level */}
                  {level >= 0 && <div className="w-4 flex-shrink-0" />}
                  {level >= 1 && <div className="w-4 flex-shrink-0" />}
                  {level >= 2 && <div className="w-4 flex-shrink-0" />}
                  <span className="text-muted-foreground/50 text-xs flex-shrink-0">→</span>
                  <div className="w-5 flex-shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">New</span>
                </div>
              ) : column.fieldName === 'summary' ? (
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                      onCreateInlineSubtask(task.id, task);
                    }
                    if (e.key === 'Escape') {
                      setCreatingSubtaskForId(null);
                      setNewSubtaskTitle("");
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!newSubtaskTitle.trim()) {
                        setCreatingSubtaskForId(null);
                      }
                    }, 200);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
            </div>
          ))}
          <div className="w-20 px-4 py-2.5 flex-shrink-0" />
        </div>
      )}

      {/* Children Rows (Subtasks) - Only show when expanded */}
      {hasChildren && isExpanded && (
        <>
          {children.map((child) => {
            const childSelected = selectedTaskIds.has(child.id);
            return (
              <TaskRow
                key={child.id}
                task={child}
                level={level + 1}
                childrenMap={childrenMap}
                expandedRows={expandedRows}
                toggleRow={toggleRow}
                onAddSubtask={onAddSubtask}
                onTaskClick={onTaskClick}
                visibleColumns={visibleColumns}
                renderCell={renderCell}
                isSelected={childSelected}
                onSelectTask={onSelectTask}
                onCellClick={onCellClick}
                hoveredTaskId={hoveredTaskId}
                setHoveredTaskId={setHoveredTaskId}
                creatingSubtaskForId={creatingSubtaskForId}
                setCreatingSubtaskForId={setCreatingSubtaskForId}
                newSubtaskTitle={newSubtaskTitle}
                setNewSubtaskTitle={setNewSubtaskTitle}
                onCreateInlineSubtask={onCreateInlineSubtask}
                selectedTaskIds={selectedTaskIds}
                isAdmin={isAdmin}
              />
            );
          })}
        </>
      )}
    </>
  );
});

// Helper function to organize tasks into parent-child hierarchy
function organizeTaskHierarchy(tasks: Task[]) {
  const childrenMap = new Map<string, Task[]>();
  const parentTasks: Task[] = [];
  const taskMap = new Map<string, Task>();

  // Sort tasks by creation date to ensure newest tasks appear in correct order
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.created).getTime() - new Date(b.created).getTime()
  );

  // First pass: Build task map
  sortedTasks.forEach((task) => {
    taskMap.set(task.id, task);
  });

  sortedTasks.forEach((task) => {
    // Robust null check: treat null, undefined, empty string, or whitespace-only as parent
    const hasParent = task.parentTaskId && task.parentTaskId.trim().length > 0;
    
    if (!hasParent) {
      // This is a parent task (top-level)
      parentTasks.push(task);
    } else {
      // This is a child task
      const parentId = task.parentTaskId!.trim();
      const parentExists = taskMap.has(parentId);
      
      if (parentExists) {
        // Parent exists in current task list - add to children
        const siblings = childrenMap.get(parentId) || [];
        siblings.push(task);
        childrenMap.set(parentId, siblings);
      } else {
        // Parent doesn't exist in filtered list - promote child to top level
        // This ensures subtasks are visible even when parent is filtered out
        parentTasks.push(task);
      }
    }
  });

  console.log('🔍 Hierarchy Debug:', {
    totalTasks: tasks.length,
    parentCount: parentTasks.length,
    childrenMapEntries: Array.from(childrenMap.entries()).map(([parentId, children]) => ({
      parentId: parentId.slice(0, 8) + '...',
      childCount: children.length,
      children: children.map(c => ({ id: c.id.slice(0, 8), issueId: c.issueId, parentId: c.parentTaskId?.slice(0, 8) }))
    })),
    sampleParents: parentTasks.slice(0, 3).map(p => ({ id: p.id.slice(0, 8), issueId: p.issueId, parentId: p.parentTaskId })),
    sampleChildren: tasks.filter(t => t.parentTaskId).slice(0, 3).map(c => ({ id: c.id.slice(0, 8), issueId: c.issueId, parentId: c.parentTaskId?.slice(0, 8) })),
    orphanedSubtasks: parentTasks.filter(t => t.parentTaskId).length
  });

  return { parentTasks, childrenMap };
}
