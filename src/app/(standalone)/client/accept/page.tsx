"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, Mail, Building2, User, Lock, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useVerifyClientInvitation, useAcceptClientInvitation } from "@/features/clients/api/use-client-invitations";
import { Alert, AlertDescription } from "@/components/ui/alert";

const acceptFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AcceptFormValues = z.infer<typeof acceptFormSchema>;

export default function ClientAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitationData, setInvitationData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: verificationData, isLoading: isVerifying, isError } = useVerifyClientInvitation(token || "");
  const { mutate: acceptInvitation, isPending: isAccepting } = useAcceptClientInvitation();

  const form = useForm<AcceptFormValues>({
    resolver: zodResolver(acceptFormSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (verificationData) {
      setInvitationData(verificationData);
    }
  }, [verificationData]);

  const verificationStatus = !token ? "invalid" : isVerifying ? "loading" : isError ? "invalid" : "valid";

  const onSubmit = (values: AcceptFormValues) => {
    if (!token) return;

    acceptInvitation(
      {
        token,
        name: values.name,
        password: values.password,
      },
      {
        onSuccess: () => {
          // Redirect to login page
          router.push("/sign-in");
        },
      }
    );
  };

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <Card className="w-full max-w-md shadow-lg bg-neutral-900 border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/20" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-white">Verifying your invitation</p>
                <p className="text-sm text-neutral-400">Please wait a moment...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <Card className="w-full max-w-md shadow-lg bg-neutral-900 border-0">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-base mt-2 text-neutral-300">
              This invitation link is invalid, has expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-500/10 border-0">
              <AlertDescription className="text-sm text-neutral-300">
                Please contact your project administrator to request a new invitation link.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push("/sign-in")}
              className="w-full"
              size="lg"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <Card className="w-full max-w-lg shadow-xl bg-neutral-900 border-0">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Accept Project Invitation</CardTitle>
          <CardDescription className="text-center text-base text-neutral-300">
            You've been invited to join <strong className="text-white">{invitationData?.projectName}</strong> as a client.
            <br />
            Create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-3 rounded-lg bg-neutral-800/50 p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-400">Email</p>
                <p className="text-sm font-medium truncate text-white">{invitationData?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-400">Workspace</p>
                <p className="text-sm font-medium truncate text-white">{invitationData?.workspaceName}</p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-neutral-200">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                          {...field}
                          placeholder="John Doe"
                          disabled={isAccepting}
                          className="pl-10 h-11 bg-neutral-800 border-0 text-white placeholder:text-neutral-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-neutral-200">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          disabled={isAccepting}
                          className="pl-10 pr-10 h-11 bg-neutral-800 border-0 text-white placeholder:text-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-neutral-200">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          disabled={isAccepting}
                          className="pl-10 pr-10 h-11 bg-neutral-800 border-0 text-white placeholder:text-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isAccepting}
                size="lg"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Accept Invitation & Create Account"
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-xs text-neutral-500">
            By accepting this invitation, you agree to the terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
