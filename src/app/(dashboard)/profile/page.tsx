"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Upload } from "lucide-react"; // , Settings - removed for now
import { CreateProfileForm } from "@/features/profiles/components/create-profile-form";
import { BulkProfileUpload } from "@/features/profiles/components/bulk-profile-upload";
import { AdminGuard } from "@/components/admin-guard";
// import { UserManagementClient } from "../admin/user-management/client"; // Commented out - now using unified profile management with optional login access

export default function AddProfilePage() {
  const [activeTab, setActiveTab] = useState<string>("individual");

  return (
    <AdminGuard>
      <div className="h-full flex flex-col">
        <div className="flex flex-col gap-y-4 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Add Profile</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Individual Profile
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload className="size-4" />
                Bulk Import
              </TabsTrigger>
              {/* User Management tab - Commented out as we now use unified profile management with optional login access */}
              {/* <TabsTrigger value="user-management" className="flex items-center gap-2">
                <Settings className="size-4" />
                User Management
              </TabsTrigger> */}
            </TabsList>

            <TabsContent value="individual" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Profile</CardTitle>
                  <CardDescription>
                    Add a new employee profile with all required details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateProfileForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="mt-6">
              <BulkProfileUpload />
            </TabsContent>

            {/* User Management Content - Commented out as we now use unified profile management with optional login access */}
            {/* <TabsContent value="user-management" className="mt-6">
              <UserManagementClient />
            </TabsContent> */}
          </Tabs>
        </div>
      </div>
    </AdminGuard>
  );
}
