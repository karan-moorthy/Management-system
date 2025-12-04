"use client";

import { useState } from "react";
import { Bug, Plus } from "lucide-react";

import { useGetAssignedBugs, useGetReportedBugs } from "../api/use-get-bugs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import { BugCard } from "./bug-card";
import { CreateBugModal } from "./create-bug-modal";

export const BugList = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: assignedBugs = [], isLoading: loadingAssigned } = useGetAssignedBugs();
  const { data: reportedBugs = [], isLoading: loadingReported } = useGetReportedBugs();

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assigned">
                Assigned to Me ({assignedBugs.length})
              </TabsTrigger>
              <TabsTrigger value="reported">
                Reported by Me ({reportedBugs.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assigned" className="mt-6">
              {loadingAssigned ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : assignedBugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bug className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No bugs assigned to you yet
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignedBugs.map((bug) => (
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
              ) : reportedBugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bug className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    You haven't reported any bugs yet
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
                  {reportedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} showAssignedTo />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateBugModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};
