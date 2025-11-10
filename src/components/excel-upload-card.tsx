"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DottedSeparator } from "@/components/dotted-separator";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useUploadExcelTasks } from "@/features/tasks/api/use-upload-excel-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

export const ExcelUploadCard = () => {
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current workspace from URL instead of managing state
  const workspaceId = useWorkspaceId();
  const { data: workspaces } = useGetWorkspaces();
  const { data: projects } = useGetProjects({ workspaceId }, { enabled: !!workspaceId });
  const { mutate: uploadExcel, isPending } = useUploadExcelTasks();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 Upload Card State:', {
      workspaceId,
      projectCount: projects?.documents?.length || 0,
      projects: projects?.documents?.map(p => ({ id: p.id, name: p.name })) || [],
      selectedProjectId: projectId,
    });
  }, [workspaceId, projects, projectId]);

  // Clear project selection when workspace changes
  React.useEffect(() => {
    setProjectId("");
  }, [workspaceId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidCsvFile(droppedFile)) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidCsvFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const isValidCsvFile = (file: File): boolean => {
    const validTypes = ['text/csv'];
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.csv$/i) !== null;
    
    // Increase file size limit from 10MB to 100MB
    const maxSizeInBytes = 100 * 1024 * 1024; // 100MB
    const isValidSize = file.size <= maxSizeInBytes;
    
    if (!isValidType) {
      alert('Please upload a CSV file only.');
      return false;
    }
    
    if (!isValidSize) {
      alert(`File size too large. Please upload a file smaller than 100MB. Current size: ${formatFileSize(file.size)}`);
      return false;
    }
    
    return true;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = () => {
    if (!file || !workspaceId || !projectId) {
      console.log('❌ Upload blocked:', {
        hasFile: !!file,
        hasWorkspace: !!workspaceId,
        hasProject: !!projectId,
        workspaceId,
        projectId,
      });
      return;
    }

    console.log('✅ Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      workspaceId,
      projectId,
      workspace: selectedWorkspace?.name,
      project: selectedProject?.name,
    });

    uploadExcel({
      file,
      workspaceId,
      projectId,
    }, {
      onSuccess: () => {
        setFile(null);
        setProjectId("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectedWorkspace = workspaces?.documents?.find(w => w.id === workspaceId);
  const selectedProject = projects?.documents?.find(p => p.id === projectId);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Task Import
        </CardTitle>
        <CardDescription>
          Upload a CSV file to create multiple tasks at once. Expected columns: Epic, Story, Planned Start, Planned Completion, Responsibility.
          <br />
          <Badge variant="outline" className="mt-2">CSV format only - Up to 100MB</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Workspace and Project Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="workspace">Current Workspace</Label>
            <div className="flex items-center h-10 px-3 py-2 text-sm border border-input rounded-md bg-muted">
              <span className="truncate">
                {selectedWorkspace?.name || "Loading..."}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!workspaceId}>
              <SelectTrigger>
                <SelectValue placeholder={!workspaceId ? "Loading..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {projects?.documents && projects.documents.length > 0 ? (
                  projects.documents.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    {workspaceId ? "No projects found. Create a project first." : "Loading projects..."}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DottedSeparator />

        {/* File Upload Area */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-border hover:border-muted-foreground"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <div className="text-sm">
                  <button
                    type="button"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Click to upload
                  </button>{" "}
                  or drag and drop
                </div>
                <p className="text-xs text-muted-foreground">
                  CSV files only, up to 100MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="mx-auto h-8 w-8 text-green-500 dark:text-green-400" />
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

            <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Status */}
        {file && workspaceId && projectId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Ready to upload to {selectedWorkspace?.name} → {selectedProject?.name}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!file || !workspaceId || !projectId || isPending}
            className="min-w-[120px]"
          >
            {isPending ? "Uploading..." : "Upload Tasks"}
          </Button>
        </div>

     

        
      </CardContent>
    </Card>
  );
};