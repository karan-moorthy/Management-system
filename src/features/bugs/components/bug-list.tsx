"use client";

import { useState, useMemo, useEffect } from "react";
import { Bug, Plus, History, Shield } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

import { useGetAssignedBugs, useGetReportedBugs } from "../api/use-get-bugs";
import { useCurrent } from "@/features/auth/api/use-current";
import { useIsGlobalAdmin } from "@/features/members/api/use-get-user-role";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import { BugCard } from "./bug-card";
import { CreateBugModal } from "./create-bug-modal";
import { BugStatus } from "../types";
import { BugDetailModal } from "./bug-detail-modal";
import { AdminBugHistory } from "./admin-bug-history";

export const BugList = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bugIdFromUrl = searchParams.get("bugId");
  const { data: currentUser } = useCurrent();
  const { data: isAdmin } = useIsGlobalAdmin();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<any>(null);
  
  const { data: assignedBugs = [], isLoading: loadingAssigned } = useGetAssignedBugs();
  const { data: reportedBugs = [], isLoading: loadingReported } = useGetReportedBugs();

  // Auto-open bug from URL parameter
  useEffect(() => {
    if (bugIdFromUrl && !loadingAssigned && !loadingReported) {
      const allBugs = [...assignedBugs, ...reportedBugs];
      const bug = allBugs.find(b => b.bugId === bugIdFromUrl);
      if (bug) {
        setSelectedBug(bug);
        // Clear the URL parameter
        router.replace("/bugs", { scroll: false });
      }
    }
  }, [bugIdFromUrl, assignedBugs, reportedBugs, loadingAssigned, loadingReported, router]);

  // Filter active (non-closed) bugs
  const activeAssignedBugs = useMemo(() => 
    assignedBugs.filter(bug => bug.status !== BugStatus.CLOSED),
    [assignedBugs]
  );

  const activeReportedBugs = useMemo(() => 
    reportedBugs.filter(bug => bug.status !== BugStatus.CLOSED),
    [reportedBugs]
  );

  // Filter closed bugs for history
  const closedBugs = useMemo(() => {
    const allBugs = [...assignedBugs, ...reportedBugs];
    // Remove duplicates and filter closed
    const uniqueBugs = Array.from(
      new Map(allBugs.map(bug => [bug.id, bug])).values()
    );
    return uniqueBugs
      .filter(bug => bug.status === BugStatus.CLOSED)
      .sort((a, b) => new Date(b.resolvedAt || b.updatedAt).getTime() - new Date(a.resolvedAt || a.updatedAt).getTime());
  }, [assignedBugs, reportedBugs]);

  return (
    <>
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-7">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Bug Tracker
          </CardTitle>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Report Bug
          </Button>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          <Tabs defaultValue="assigned" className="w-full">
            <TabsList className={isAdmin ? "grid w-full grid-cols-3 h-auto" : "grid w-full grid-cols-2"}>
              <TabsTrigger value="assigned" className="whitespace-normal text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Assigned to Me ({activeAssignedBugs.length})</span>
                <span className="sm:hidden">Assigned ({activeAssignedBugs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="reported" className="whitespace-normal text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Reported by Me ({activeReportedBugs.length})</span>
                <span className="sm:hidden">Reported ({activeReportedBugs.length})</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="flex items-center gap-1.5 whitespace-normal text-xs sm:text-sm py-2">
                  <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden lg:inline">All Bugs (Admin)</span>
                  <span className="hidden sm:inline lg:hidden">Admin</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="assigned" className="mt-6">
              {loadingAssigned ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activeAssignedBugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bug className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No active bugs assigned to you
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeAssignedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} showReportedBy />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="reported" className="mt-6">
              {loadingReported ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activeReportedBugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bug className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    You haven't reported any active bugs yet
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Report Your First Bug
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeReportedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} showAssignedTo />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="admin" className="mt-6">
                <AdminBugHistory isAdmin={isAdmin} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* History Section for Closed Bugs */}
      {closedBugs.length > 0 && (
        <Card className="w-full border-none shadow-none mt-6">
          <CardHeader className="p-7">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5" />
              Closed Bugs History ({closedBugs.length})
            </CardTitle>
          </CardHeader>
          <div className="px-7">
            <DottedSeparator />
          </div>
          <CardContent className="p-7">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {closedBugs.map((bug) => (
                <BugCard 
                  key={bug.id} 
                  bug={bug} 
                  showAssignedTo 
                  showReportedBy 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateBugModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {selectedBug && currentUser && (
        <BugDetailModal
          bug={selectedBug}
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          isAssignee={selectedBug.assignedTo === currentUser.id}
          isReporter={selectedBug.reportedBy === currentUser.id}
        />
      )}
    </>
  );
};
