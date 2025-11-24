"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, File } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TaskOverview, OverviewStatus } from "../types";
import { useReviewTaskOverview } from "../api/use-review-task-overview";

interface TaskOverviewReviewProps {
  overview: TaskOverview;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TaskOverviewReview({
  overview,
  isOpen,
  onClose,
  onSuccess,
}: TaskOverviewReviewProps) {
  const [adminRemarks, setAdminRemarks] = useState("");
  const { mutate: reviewOverview, isPending } = useReviewTaskOverview();

  const handleApprove = () => {
    reviewOverview(
      {
        overviewId: overview.id,
        status: OverviewStatus.APPROVED,
        adminRemarks: adminRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAdminRemarks("");
          onSuccess?.();
          onClose();
        },
      }
    );
  };

  const handleRework = () => {
    if (!adminRemarks.trim()) {
      alert("Please provide remarks when requesting rework");
      return;
    }

    reviewOverview(
      {
        overviewId: overview.id,
        status: OverviewStatus.REWORK,
        adminRemarks: adminRemarks.trim(),
      },
      {
        onSuccess: () => {
          setAdminRemarks("");
          onSuccess?.();
          onClose();
        },
      }
    );
  };

  const handleFileDownload = (fileUrl: string, index: number) => {
    // If it's a base64 string, convert to downloadable file
    if (fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `output-file-${index + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If it's a regular URL, open in new tab
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Task Completion</DialogTitle>
          <DialogDescription>
            Review and approve or request rework
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Task:</span> {overview.taskTitle}
            </div>
            <div>
              <span className="font-semibold">Employee:</span> {overview.employeeName}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Submitted:</span>{" "}
              {format(new Date(overview.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* Work Description */}
          <div className="space-y-2">
            <Label className="font-semibold">Work Completed</Label>
            <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
              {overview.completedWorkDescription}
            </div>
          </div>

          {/* Sample Output File (if exists) */}
          {overview.proofOfWork?.files && overview.proofOfWork.files.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <File className="h-4 w-4" />
                Sample Output File
              </Label>
              <div className="space-y-1">
                {overview.proofOfWork.files.map((fileUrl, index) => (
                  <button
                    key={index}
                    onClick={() => handleFileDownload(fileUrl, index)}
                    className="w-full text-left block bg-muted p-2 rounded hover:bg-muted/70 transition text-sm text-blue-600 hover:underline"
                  >
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      <span>Download Output File {index + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Remarks */}
          <div className="space-y-2">
            <Label htmlFor="adminRemarks" className="font-semibold">
              Admin Feedback {overview.status === OverviewStatus.PENDING && <span className="text-xs text-muted-foreground">(Required for rework)</span>}
            </Label>
            <Textarea
              id="adminRemarks"
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="Provide feedback or reasons for rework..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          {overview.status === OverviewStatus.PENDING && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRework}
                disabled={isPending}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Request Rework
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isPending}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            </div>
          )}

          {/* Already Reviewed Status */}
          {overview.status !== OverviewStatus.PENDING && (
            <div className="space-y-2">
              <Badge
                variant={overview.status === OverviewStatus.APPROVED ? "default" : "destructive"}
              >
                {overview.status === OverviewStatus.APPROVED ? "Approved" : "Rework Requested"}
              </Badge>
              
              {overview.adminRemarks && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm font-semibold mb-1">Admin Feedback:</p>
                  <p className="text-sm whitespace-pre-wrap">{overview.adminRemarks}</p>
                </div>
              )}

              {overview.reviewedAt && (
                <p className="text-xs text-muted-foreground">
                  Reviewed on {format(new Date(overview.reviewedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
