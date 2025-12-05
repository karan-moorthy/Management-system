import { FolderIcon, ListChecksIcon, UserIcon, CalendarIcon, CalendarRangeIcon, FilterIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useIsGlobalAdmin } from "@/features/members/api/use-get-user-role";
import { useGetCustomFieldDefinitions, useGetIssueTypes } from "../api/use-get-custom-fields";

import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useTaskFilters } from "../hooks/use-task-filters";
import { CustomFieldType } from "../types-custom-fields";

interface DynamicDataFiltersProps {
  hideProjectFilter?: boolean;
}

export const DynamicDataFilters = ({ hideProjectFilter }: DynamicDataFiltersProps) => {
  const workspaceId = useWorkspaceId();
  const { data: isAdmin, isLoading: isLoadingRole } = useIsGlobalAdmin();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch custom field definitions
  const { data: customFields, isLoading: isLoadingCustomFields } = useGetCustomFieldDefinitions(workspaceId);
  const { data: issueTypes, isLoading: isLoadingIssueTypes } = useGetIssueTypes(workspaceId);

  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId,
  });

  const isLoading = isLoadingProjects || isLoadingMembers || isLoadingCustomFields || isLoadingIssueTypes;

  const projectOptions = projects?.documents.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  const memberOptions = members?.documents.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  const issueTypeOptions = issueTypes?.map((issueType) => ({
    value: issueType.issueTypeKey,
    label: issueType.issueTypeName,
    icon: issueType.icon,
    color: issueType.color,
  }));

  // Get filterable custom fields
  const filterableCustomFields = useMemo(() => {
    return customFields?.filter((field) => field.isFilterable) || [];
  }, [customFields]);

  const [filters, setFilters] = useTaskFilters();

  // Generic filter change handler
  const onFilterChange = (key: string, value: string | null) => {
    if (value === "all" || !value) {
      setFilters({ [key]: null });
    } else {
      setFilters({ [key]: value });
    }
  };

  if (isLoading) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-2 flex-wrap">
      {/* Issue Type Filter (Dynamic from DB) */}
      {issueTypeOptions && issueTypeOptions.length > 0 && (
        <Select
          defaultValue={(filters as any).issueType ?? undefined}
          onValueChange={(value) => onFilterChange("issueType", value)}
        >
          <SelectTrigger className="w-full lg:w-auto h-8">
            <div className="flex items-center pr-2">
              <ListChecksIcon className="size-4 mr-2" />
              <SelectValue placeholder="All issue types" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All issue types</SelectItem>
            <SelectSeparator />
            {issueTypeOptions.map((issueType) => (
              <SelectItem key={issueType.value} value={issueType.value}>
                <div className="flex items-center gap-2">
                  {issueType.icon && <span>{issueType.icon}</span>}
                  <span>{issueType.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status Filter (Could be dynamic from workflow in future) */}
      <Select
        defaultValue={(filters as any).status ?? undefined}
        onValueChange={(value) => onFilterChange("status", value)}
      >
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <ListChecksIcon className="size-4 mr-2" />
            <SelectValue placeholder="All statuses" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectSeparator />
          <SelectItem value="TODO">Todo</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="IN_REVIEW">In Review</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>

      {/* Month Filter */}
      <Select
        defaultValue={(filters as any).month ?? undefined}
        onValueChange={(value) => onFilterChange("month", value)}
      >
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <CalendarIcon className="size-4 mr-2" />
            <SelectValue placeholder="All months" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          <SelectSeparator />
          <SelectItem value="current">This Month</SelectItem>
          <SelectItem value="last">Last Month</SelectItem>
          <SelectItem value="next">Next Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Week Filter */}
      <Select
        defaultValue={(filters as any).week ?? undefined}
        onValueChange={(value) => onFilterChange("week", value)}
      >
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <CalendarRangeIcon className="size-4 mr-2" />
            <SelectValue placeholder="All weeks" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All weeks</SelectItem>
          <SelectSeparator />
          <SelectItem value="current">This Week</SelectItem>
          <SelectItem value="last">Last Week</SelectItem>
          <SelectItem value="next">Next Week</SelectItem>
        </SelectContent>
      </Select>

      {/* Assignee Filter (Admin only) */}
      {mounted && isAdmin && (
        <Select
          defaultValue={(filters as any).assigneeId ?? undefined}
          onValueChange={(value) => onFilterChange("assigneeId", value)}
        >
          <SelectTrigger className="w-full lg:w-auto h-8">
            <div className="flex items-center pr-2">
              <UserIcon className="size-4 mr-2" />
              <SelectValue placeholder="All assignees" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectSeparator />
            {memberOptions?.map((member) => (
              <SelectItem key={member.value} value={member.value}>
                {member.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Project Filter */}
      {!hideProjectFilter && (
        <Select
          defaultValue={(filters as any).projectId ?? undefined}
          onValueChange={(value) => onFilterChange("projectId", value)}
        >
          <SelectTrigger className="w-full lg:w-auto h-8">
            <div className="flex items-center pr-2">
              <FolderIcon className="size-4 mr-2" />
              <SelectValue placeholder="All projects" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectSeparator />
            {projectOptions?.map((project) => (
              <SelectItem key={project.value} value={project.value}>
                {project.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Due Date Filter */}
      <DatePicker
        placeholder="Due date"
        className="h-8 w-full lg:w-auto"
        value={(filters as any).dueDate ? new Date((filters as any).dueDate) : undefined}
        onChange={(date) => {
          setFilters({ dueDate: date ? date.toISOString() : null } as any);
        }}
      />

      {/* Dynamic Custom Field Filters */}
      {filterableCustomFields.map((field) => {
        // Only render SELECT type fields as filters for now
        if (field.fieldType === CustomFieldType.SELECT && field.fieldOptions?.options) {
          return (
            <Select
              key={field.id}
              defaultValue={(filters as any)[`customField_${field.fieldKey}`] ?? undefined}
              onValueChange={(value) => onFilterChange(`customField_${field.fieldKey}`, value)}
            >
              <SelectTrigger className="w-full lg:w-auto h-8">
                <div className="flex items-center pr-2">
                  <FilterIcon className="size-3 mr-2" />
                  <SelectValue placeholder={`All ${field.fieldName.toLowerCase()}`} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {field.fieldName.toLowerCase()}</SelectItem>
                <SelectSeparator />
                {field.fieldOptions.options.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // CHECKBOX filter
        if (field.fieldType === CustomFieldType.CHECKBOX) {
          return (
            <Select
              key={field.id}
              defaultValue={(filters as any)[`customField_${field.fieldKey}`] ?? undefined}
              onValueChange={(value) => onFilterChange(`customField_${field.fieldKey}`, value)}
            >
              <SelectTrigger className="w-full lg:w-auto h-8">
                <div className="flex items-center pr-2">
                  <FilterIcon className="size-3 mr-2" />
                  <SelectValue placeholder={field.fieldName} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectSeparator />
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          );
        }

        // USER filter
        if (field.fieldType === CustomFieldType.USER) {
          return (
            <Select
              key={field.id}
              defaultValue={(filters as any)[`customField_${field.fieldKey}`] ?? undefined}
              onValueChange={(value) => onFilterChange(`customField_${field.fieldKey}`, value)}
            >
              <SelectTrigger className="w-full lg:w-auto h-8">
                <div className="flex items-center pr-2">
                  <UserIcon className="size-3 mr-2" />
                  <SelectValue placeholder={field.fieldName} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectSeparator />
                {memberOptions?.map((member) => (
                  <SelectItem key={member.value} value={member.value}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        return null;
      })}

      {/* Filter Count Badge */}
      {Object.values(filters).filter((v) => v !== null).length > 0 && (
        <Badge variant="secondary" className="h-8 px-3 flex items-center gap-1">
          <FilterIcon className="size-3" />
          {Object.values(filters).filter((v) => v !== null).length} active
        </Badge>
      )}
    </div>
  );
};
