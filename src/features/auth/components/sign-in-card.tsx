"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa6";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signUpWithGithub, signUpWithGoogle } from "@/lib/oauth";

import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";

export const SignInCard = () => {
  const { mutate, isPending } = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate({ json: values });
  };

  return (
    <div className="w-full md:w-[520px]">
      <Card className="border border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <CardHeader className="relative space-y-3 pb-8 pt-10 px-8">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              Enter your credentials to access your account
            </p>
          </CardHeader>
        </div>

        <CardContent className="p-8 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <label className="text-sm font-medium text-foreground/90 mb-2 block">
                      Email Address
                    </label>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          className="relative h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground/90">
                        Password
                      </label>
                      {/* <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                        Forgot password?
                      </Link> */}
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="relative h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <Button 
                disabled={isPending} 
                size="lg" 
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>

          {/* OAuth buttons temporarily disabled - fix redirect URLs first */}
          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => signUpWithGoogle()}
              disabled={isPending}
              variant="outline"
              size="lg"
              className="h-12 hover:bg-accent/50 transition-all duration-200 border-border/50"
            >
              <FcGoogle className="size-5" />
            </Button>
            <Button
              onClick={() => signUpWithGithub()}
              disabled={isPending}
              variant="outline"
              size="lg"
              className="h-12 hover:bg-accent/50 transition-all duration-200 border-border/50"
            >
              <FaGithub className="size-5" />
            </Button>
          </div> */}
        </CardContent>

        {/* Footer with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
          <div className="relative px-8 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
