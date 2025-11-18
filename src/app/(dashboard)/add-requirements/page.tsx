"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateRequirement } from "@/features/requirements/api/use-create-requirement";
import { useGetProfiles } from "@/features/requirements/api/use-get-profiles";

interface FileUploadRow {
  id: string;
  file: File | null;
}

export default function AddRequirementsPage() {
  const router = useRouter();
  const { data: profiles, isLoading: isLoadingProfiles } = useGetProfiles();
  const { mutate: createRequirement, isPending } = useCreateRequirement();

  const [tentativeTitle, setTentativeTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  
  const [sampleInputFiles, setSampleInputFiles] = useState<FileUploadRow[]>([
    { id: "sample-1", file: null },
  ]);
  
  const [expectedOutputFiles, setExpectedOutputFiles] = useState<FileUploadRow[]>([
    { id: "output-1", file: null },
  ]);

  const handleAddSampleInputRow = () => {
    setSampleInputFiles([
      ...sampleInputFiles,
      { id: `sample-${Date.now()}`, file: null },
    ]);
  };

  const handleAddOutputRow = () => {
    setExpectedOutputFiles([
      ...expectedOutputFiles,
      { id: `output-${Date.now()}`, file: null },
    ]);
  };

  const handleSampleFileChange = (id: string, file: File | null) => {
    setSampleInputFiles(
      sampleInputFiles.map((row) =>
        row.id === id ? { ...row, file } : row
      )
    );
  };

  const handleOutputFileChange = (id: string, file: File | null) => {
    setExpectedOutputFiles(
      expectedOutputFiles.map((row) =>
        row.id === id ? { ...row, file } : row
      )
    );
  };

  const handleRemoveSampleFile = (id: string) => {
    if (sampleInputFiles.length > 1) {
      setSampleInputFiles(sampleInputFiles.filter((row) => row.id !== id));
    } else {
      // If it's the last row, just clear the file instead of removing the row
      setSampleInputFiles([{ id: "sample-1", file: null }]);
    }
  };

  const handleRemoveOutputFile = (id: string) => {
    if (expectedOutputFiles.length > 1) {
      setExpectedOutputFiles(expectedOutputFiles.filter((row) => row.id !== id));
    } else {
      // If it's the last row, just clear the file instead of removing the row
      setExpectedOutputFiles([{ id: "output-1", file: null }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tentativeTitle || !customer || !projectManager) {
      return;
    }

    // For now, we'll just store file names. In production, you'd upload files first
    const sampleFiles = sampleInputFiles
      .filter(row => row.file)
      .map(row => row.file!.name);
    
    const outputFiles = expectedOutputFiles
      .filter(row => row.file)
      .map(row => row.file!.name);

    createRequirement({
      tentativeTitle,
      customer,
      projectManagerId: projectManager,
      projectDescription,
      sampleInputFiles: sampleFiles,
      expectedOutputFiles: outputFiles,
    }, {
      onSuccess: () => {
        router.push("/projects");
      }
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="w-full h-full p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add Requirements</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Fill in the project requirement details below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="max-w-5xl space-y-8 bg-card p-8 rounded-lg border shadow-sm">
          
          {/* Form Fields Section */}
          <div className="space-y-6">
            {/* Tentative Project Title */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium md:text-right">
                Tentative Project Title <span className="text-destructive">*</span>
              </label>
              <div className="md:col-span-3">
                <Input
                  value={tentativeTitle}
                  onChange={(e) => setTentativeTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="w-full"
                  required
                />
              </div>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium md:text-right">
                Customer <span className="text-destructive">*</span>
              </label>
              <div className="md:col-span-3">
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full"
                  required
                />
              </div>
            </div>

            {/* Project Manager */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium md:text-right">
                Project Manager <span className="text-destructive">*</span>
              </label>
              <div className="md:col-span-3">
                <Select 
                  value={projectManager} 
                  onValueChange={setProjectManager}
                  disabled={isLoadingProfiles}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoadingProfiles ? "Loading..." : "Select project manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles && profiles.length > 0 ? (
                      profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} {profile.designation ? `(${profile.designation})` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-profiles" disabled>
                        No employees found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project Description */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium md:text-right md:pt-3">
                Project Description
              </label>
              <div className="md:col-span-3">
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter detailed project description"
                  className="w-full min-h-[120px] resize-none"
                  rows={6}
                />
              </div>
            </div>
          </div>

          {/* Sample Input File Section */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Sample Input File</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSampleInputRow}
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {sampleInputFiles.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="text-sm font-medium md:text-right">
                    File {index + 1}
                  </label>
                  <div className="md:col-span-3">
                    {row.file ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 p-3 bg-muted rounded-md border flex items-center justify-between">
                          <span className="text-sm truncate">{row.file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(row.file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveSampleFile(row.id)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) =>
                            handleSampleFileChange(
                              row.id,
                              e.target.files?.[0] || null
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0 px-4"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Output File Section */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Expected Output File</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOutputRow}
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {expectedOutputFiles.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="text-sm font-medium md:text-right">
                    File {index + 1}
                  </label>
                  <div className="md:col-span-3">
                    {row.file ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 p-3 bg-muted rounded-md border flex items-center justify-between">
                          <span className="text-sm truncate">{row.file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(row.file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveOutputFile(row.id)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) =>
                            handleOutputFileChange(
                              row.id,
                              e.target.files?.[0] || null
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0 px-4"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="flex items-center justify-start gap-4 pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              size="lg"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              size="lg"
              disabled={isPending || !tentativeTitle || !customer || !projectManager}
            >
              {isPending ? "Submitting..." : "Submit"}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              size="lg"
              disabled={isPending}
            >
              Edit
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
