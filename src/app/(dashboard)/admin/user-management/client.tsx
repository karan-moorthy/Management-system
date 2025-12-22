"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Shield, Users, Info, Eye, EyeOff } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberRole } from "@/features/members/types";

/**
 * User creation form validation schema
 * Enforces minimum requirements for new user accounts
 */
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(MemberRole),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

/**
 * User Management Client Component
 * 
 * Provides admin interface for creating test users with different roles.
 * Features:
 * - Quick create buttons with pre-filled credentials
 * - Manual form with role selection
 * - Password visibility toggle
 * - Role-based color coding
 * 
 * @access Admin only (enforced in parent page component)
 */

export const UserManagementClient = () => {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: MemberRole.EMPLOYEE,
    },
  });

  // Mutation for creating new user via API
  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserValues) => {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("✅ User created successfully!", {
        description: `${data.email} can now login with the password you set.`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => {
      toast.error("❌ Failed to create user", {
        description: error.message,
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: CreateUserValues) => {
    createUserMutation.mutate(values);
  };

  /**
   * Pre-fills the form with test credentials for a specific role
   * Pattern: [role]@test.pms / [role]123
   */
  const handleQuickCreate = (role: MemberRole) => {
    const roleNames: Record<MemberRole, string> = {
      [MemberRole.ADMIN]: "admin",
      [MemberRole.PROJECT_MANAGER]: "manager",
      [MemberRole.TEAM_LEAD]: "teamlead",
      [MemberRole.EMPLOYEE]: "employee",
      [MemberRole.MANAGEMENT]: "management",
      [MemberRole.MEMBER]: "member",
      [MemberRole.CLIENT]: "client",
    };

    const roleName = roleNames[role];
    
    form.setValue("name", `Test ${roleName.charAt(0).toUpperCase() + roleName.slice(1)}`);
    form.setValue("email", `${roleName}@test.pms`);
    form.setValue("password", `${roleName}123`);
    form.setValue("role", role);

    toast.info("📝 Form pre-filled", {
      description: "Review the details and click 'Create User' to save.",
    });
  };

  /**
   * Generates color-coded badge for each role type
   * Used in quick create buttons and role selection
   */
  const getRoleBadge = (role: MemberRole) => {
    const roleConfig: Record<MemberRole, { icon: string; color: string; label: string }> = {
      [MemberRole.ADMIN]: { icon: "👑", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", label: "Admin" },
      [MemberRole.PROJECT_MANAGER]: { icon: "📊", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Project Manager" },
      [MemberRole.TEAM_LEAD]: { icon: "🎯", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", label: "Team Lead" },
      [MemberRole.EMPLOYEE]: { icon: "👷", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", label: "Employee" },
      [MemberRole.MANAGEMENT]: { icon: "📈", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300", label: "Management" },
      [MemberRole.MEMBER]: { icon: "👤", color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300", label: "Member" },
      [MemberRole.CLIENT]: { icon: "🔒", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300", label: "Client" },
    };

    const config = roleConfig[role];
    return (
      <Badge className={`${config.color} font-medium border-0`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="h-full w-full max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>
            <p className="text-muted-foreground">
              Create test users with different roles for RBAC testing
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>

        <Separator />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Quick Create
                </CardTitle>
                <CardDescription className="text-xs">
                  Pre-fill form with test credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-10 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                  onClick={() => handleQuickCreate(MemberRole.ADMIN)}
                >
                  {getRoleBadge(MemberRole.ADMIN)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-10 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  onClick={() => handleQuickCreate(MemberRole.PROJECT_MANAGER)}
                >
                  {getRoleBadge(MemberRole.PROJECT_MANAGER)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-10 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                  onClick={() => handleQuickCreate(MemberRole.TEAM_LEAD)}
                >
                  {getRoleBadge(MemberRole.TEAM_LEAD)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-10 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                  onClick={() => handleQuickCreate(MemberRole.EMPLOYEE)}
                >
                  {getRoleBadge(MemberRole.EMPLOYEE)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-10 hover:bg-pink-50 dark:hover:bg-pink-950 transition-colors"
                  onClick={() => handleQuickCreate(MemberRole.MANAGEMENT)}
                >
                  {getRoleBadge(MemberRole.MANAGEMENT)}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Test Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono">
                <div className="space-y-1">
                  <div className="font-semibold text-muted-foreground">Email Pattern:</div>
                  <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                    [role]@test.pms
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-muted-foreground">Password Pattern:</div>
                  <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                    [role]123
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create User Form */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Add a new user with login credentials and role assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., user@test.pms" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="Minimum 6 characters" 
                                type={showPassword ? "text" : "password"}
                                {...field} 
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            User will login with this password
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Role</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={MemberRole.ADMIN}>
                                <div className="flex items-center gap-2">
                                  <span>👑</span>
                                  <div>
                                    <div className="font-medium">Admin</div>
                                    <div className="text-xs text-muted-foreground">Full system access</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value={MemberRole.PROJECT_MANAGER}>
                                <div className="flex items-center gap-2">
                                  <span>📊</span>
                                  <div>
                                    <div className="font-medium">Project Manager</div>
                                    <div className="text-xs text-muted-foreground">Manage projects & teams</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value={MemberRole.TEAM_LEAD}>
                                <div className="flex items-center gap-2">
                                  <span>🎯</span>
                                  <div>
                                    <div className="font-medium">Team Lead</div>
                                    <div className="text-xs text-muted-foreground">Lead teams & tasks</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value={MemberRole.EMPLOYEE}>
                                <div className="flex items-center gap-2">
                                  <span>👷</span>
                                  <div>
                                    <div className="font-medium">Employee</div>
                                    <div className="text-xs text-muted-foreground">Work on tasks</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value={MemberRole.MANAGEMENT}>
                                <div className="flex items-center gap-2">
                                  <span>📈</span>
                                  <div>
                                    <div className="font-medium">Management</div>
                                    <div className="text-xs text-muted-foreground">View reports</div>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Defines what the user can access and do
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Creating User...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create User Account
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
