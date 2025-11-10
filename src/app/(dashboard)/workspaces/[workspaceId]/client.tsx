"use client";

import { Analytics } from "@/components/analytics";
import { DottedSeparator } from "@/components/dotted-separator";
import { ExcelUploadCard } from "@/components/excel-upload-card";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConditionalGuard } from "@/components/permission-guard";
import { usePermissionContext } from "@/components/providers/permission-provider";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { Member } from "@/features/members/types";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { Project } from "@/features/projects/types";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { Task } from "@/features/tasks/types";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: analytics, isLoading: isLoadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
  });
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId,
  });

  const isLoading =
    isLoadingAnalytics ||
    isLoadingTasks ||
    isLoadingProjects ||
    isLoadingMembers;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!analytics || !tasks || !projects || !members) {
    return <PageError message="Failed to load workspace data." />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <Analytics data={analytics} />
      <ExcelUploadCard />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TaskList data={tasks.documents as Task[]} total={tasks.total} />
        <ProjectList data={projects.documents} total={projects.total} />
        <MemberList data={members.documents as Member[]} total={members.total} />
      </div>
    </div>
  );
};

interface TaskListProps {
  data: Task[];
  total: number;
}

export const TaskList = ({ data, total }: TaskListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createTask } = useCreateTaskModal();
  const permissions = usePermissionContext();

  // Sort tasks by priority (Critical first, then High, Medium, Low)
  const sortedTasks = [...data].sort((a, b) => {
    const priorityOrder = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
    
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    
    // Sort by priority in descending order
    return bPriority - aPriority;
  });

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Tasks ({total})</p>
          <ConditionalGuard
            condition={permissions.canCreateTask(undefined)}
            fallback={null}
          >
            <Button variant="muted" size="icon" onClick={createTask}>
              <PlusIcon className="size-4 text-neutral-400" />
            </Button>
          </ConditionalGuard>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="flex flex-col gap-y-4">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-lg font-medium truncate flex-1">{task.summary}</p>
                      <div className="flex gap-1 ml-2">
                        {task.priority && (
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'Critical' ? 'bg-red-500' :
                            task.priority === 'High' ? 'bg-orange-500' :
                            task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} title={`Priority: ${task.priority}`} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <p className="text-sm text-muted-foreground">{task.project?.name || task.projectName}</p>
                      <div className="size-1 rounded-full bg-muted-foreground/50" />
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">{task.issueType}</span>
                      {task.dueDate && !isNaN(new Date(task.dueDate).getTime()) && (
                        <>
                          <div className="size-1 rounded-full bg-muted-foreground/50" />
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarIcon className="size-3 mr-1" />
                            <span className="truncate">
                              {formatDistanceToNow(new Date(task.dueDate))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No tasks found
          </li>
        </ul>
        <Button variant="muted" className="mt-4 w-full" asChild>
          <Link href={`/workspaces/${workspaceId}/tasks`}>Show All</Link>
        </Button>
      </div>
    </div>
  );
};

interface ProjectListProps {
  data: Project[];
  total: number;
}

export const ProjectList = ({ data, total }: ProjectListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createProject } = useCreateProjectModal();
  const permissions = usePermissionContext();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Projects ({total})</p>
          <ConditionalGuard
            condition={permissions.canCreateProject}
            fallback={null}
          >
            <Button variant="secondary" size="icon" onClick={createProject}>
              <PlusIcon className="size-4 text-muted-foreground" />
            </Button>
          </ConditionalGuard>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((project) => (
            <li key={project.id}>
              <Link href={`/workspaces/${workspaceId}/projects/${project.id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="flex items-center gap-x-2.5 p-4">
                    <ProjectAvatar
                      name={project.name}
                      image={project.imageUrl || undefined}
                      className="size-12"
                      fallbackClassName="text-lg"
                    />
                    <p className="text-lg font-medium truncate">
                      {project.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No projects found
          </li>
        </ul>
      </div>
    </div>
  );
};

interface MemberListProps {
  data: Member[];
  total: number;
}

export const MemberList = ({ data, total }: MemberListProps) => {
  const workspaceId = useWorkspaceId();
  const permissions = usePermissionContext();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Members ({total})</p>
          <ConditionalGuard
            condition={permissions.canManageUsers}
            fallback={null}
          >
            <Button variant="secondary" size="icon" asChild>
              <Link href={`/workspaces/${workspaceId}/members`}>
                <SettingsIcon className="size-4 text-muted-foreground" />
              </Link>
            </Button>
          </ConditionalGuard>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((member) => (
            <li key={member.id}>
              <Card className="shadow-none rounded-lg overflow-hidden">
                <CardContent className="p-3 flex flex-col items-center gap-y-2">
                  <MemberAvatar name={member.name} className="size-12" />
                  <div className="flex flex-col items-center overflow-hidden w-full">
                    <p className="text-sm font-medium line-clamp-1 w-full text-center">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 w-full text-center">
                      {member.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No members found
          </li>
        </ul>
      </div>
    </div>
  );
};
