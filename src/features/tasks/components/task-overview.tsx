import { PencilIcon } from "lucide-react";

import { DottedSeparator } from "@/components/dotted-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { snakeCaseToTitleCase } from "@/lib/utils";

import { MemberAvatar } from "@/features/members/components/member-avatar";

import { OverviewProperty } from "./overview-property";
import { TaskDate } from "./task-date";

import { useEditTaskModal } from "../hooks/use-edit-task-modal";
import { Task } from "../types";

interface TaskOverviewProps {
  task: Task;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
  const { open } = useEditTaskModal();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Overview</p>
          <Button onClick={() => open(task.id)} size="sm" variant="secondary">
            <PencilIcon className="size-4 mr-2" />
            Edit
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <div className="flex flex-col gap-y-4">
          <OverviewProperty label="Issue ID">
            <p className="text-sm font-mono font-medium">{task.issueId}</p>
          </OverviewProperty>
          <OverviewProperty label="Issue Type">
            <Badge variant="outline">{task.issueType}</Badge>
          </OverviewProperty>
          <OverviewProperty label="Status">
            <Badge variant={task.status}>
              {snakeCaseToTitleCase(task.status)}
            </Badge>
          </OverviewProperty>
          <OverviewProperty label="Priority">
            <Badge 
              variant="outline"
              className={
                task.priority === "Critical" ? "bg-red-100 text-red-800" :
                task.priority === "High" ? "bg-orange-100 text-orange-800" :
                task.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                "bg-blue-100 text-blue-800"
              }
            >
              {task.priority}
            </Badge>
          </OverviewProperty>
          <OverviewProperty label="Assignee">
            {task.assignee ? (
              <>
                <MemberAvatar name={task.assignee.name} className="size-6" />
                <p className="text-sm font-medium">{task.assignee.name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </OverviewProperty>
          <OverviewProperty label="Due Date">
            <TaskDate value={task.dueDate || ""} className="text-sm font-medium" />
          </OverviewProperty>
          {task.estimatedHours && (
            <OverviewProperty label="Estimated Hours">
              <p className="text-sm font-medium">{task.estimatedHours}h</p>
            </OverviewProperty>
          )}
          {task.actualHours > 0 && (
            <OverviewProperty label="Actual Hours">
              <p className="text-sm font-medium">{task.actualHours}h</p>
            </OverviewProperty>
          )}
          {task.labels && task.labels.length > 0 && (
            <OverviewProperty label="Labels">
              <div className="flex flex-wrap gap-1">
                {task.labels.map((label, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </OverviewProperty>
          )}
          {task.resolution && (
            <OverviewProperty label="Resolution">
              <Badge variant="outline">{task.resolution}</Badge>
            </OverviewProperty>
          )}
        </div>
      </div>
    </div>
  );
};
