"use client";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useGetProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4 h-full">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">All Projects</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects?.documents && projects.documents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.documents.map((project: any) => (
              <div
                key={project.$id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
                <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                {project.imageUrl && (
                  <img
                    src={project.imageUrl}
                    alt={project.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <Link href={`/workspaces/${project.workspaceId}/projects/${project.$id}`}>
                  <Button variant="ghost" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No projects found</p>
          </div>
        )}
      </div>
    </div>
  );
}
