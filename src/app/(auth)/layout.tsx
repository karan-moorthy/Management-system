"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative mx-auto max-w-screen-2xl p-4 md:p-6">
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative p-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
                <Image src="/logo.svg" alt="logo" width={40} height={32} />
              </div>
            </div>
            <div>
              <p className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">GGS</p>
              <p className="text-xs text-muted-foreground">Project Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <div className="p-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
              <ModeToggle />
            </div>
            {/* Sign-up button commented out - not needed for current project */}
            {/* <Button asChild variant="secondary" className="shadow-lg">
              <Link href={isSignIn ? "/sign-up" : "/sign-in"}>
                {isSignIn ? "Sign Up" : "Login"}
              </Link>
            </Button> */}
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center pt-8 md:pt-16">
          {children}
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;
