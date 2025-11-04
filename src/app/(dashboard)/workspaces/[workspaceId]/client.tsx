"use client";

import { Analytics } from "@/components/analytics";
import { DottedSeparator } from "@/components/dotted-separator";
import { ExcelUploadCard } from "@/components/excel-upload-card";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  // Sort tasks by priority and importance (Critical first, then High, Medium, Low)
  const sortedTasks = [...data].sort((a, b) => {
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const importanceOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] || 0;
    const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] || 0;
    
    // First sort by priority, then by importance
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Descending order
    }
    return bImportance - aImportance; // Descending order
  });

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Tasks ({total})</p>
          <Button variant="muted" size="icon" onClick={createTask}>
            <PlusIcon className="size-4 text-neutral-400" />
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="flex flex-col gap-y-4">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-lg font-medium truncate flex-1">{task.name}</p>
                      <div className="flex gap-1 ml-2">
                        {task.priority && (
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'CRITICAL' ? 'bg-red-500' :
                            task.priority === 'HIGH' ? 'bg-orange-500' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} title={`Priority: ${task.priority}`} />
                        )}
                        {task.importance && (
                          <div className={`w-2 h-2 rounded-full ${
                            task.importance === 'CRITICAL' ? 'bg-purple-700' :
                            task.importance === 'HIGH' ? 'bg-purple-500' :
                            task.importance === 'MEDIUM' ? 'bg-blue-500' : 'bg-blue-300'
                          }`} title={`Importance: ${task.importance}`} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <p className="text-sm text-gray-600">{task.project?.name}</p>
                      {task.category && (
                        <>
                          <div className="size-1 rounded-full bg-neutral-300" />
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{task.category}</span>
                        </>
                      )}
                      <div className="size-1 rounded-full bg-neutral-300" />
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="size-3 mr-1" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(task.dueDate))}
                        </span>
                      </div>
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

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Projects ({total})</p>
          <Button variant="secondary" size="icon" onClick={createProject}>
            <PlusIcon className="size-4 text-neutral-400" />
          </Button>
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

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Members ({total})</p>
          <Button variant="secondary" size="icon" asChild>
            <Link href={`/workspaces/${workspaceId}/members`}>
              <SettingsIcon className="size-4 text-neutral-400" />
            </Link>
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((member) => (
            <li key={member.id}>
              <Card className="shadow-none rounded-lg overflow-hidden">
                <CardContent className="p-3 flex flex-col items-center gap-x-2">
                  <MemberAvatar name={member.name} className="size-12" />
                  <div className="flex flex-col items-center overflow-hidden">
                    <p className="text-lg font-medium line-clamp-1">
                      {member.name}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
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
