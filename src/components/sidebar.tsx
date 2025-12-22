"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Clock, 
  Lightbulb, 
  FileText, 
  Video, 
  MessageSquare, 
  GitCompare,
  BarChart3,
  PlusCircle,
  GoalIcon,
  ChevronDown,
  ChevronRight,
  User,
  UserPen,
  FileCheck,
  Calendar,
  Bug
} from "lucide-react";
import { GoHome, GoHomeFill, GoCheckCircle, GoCheckCircleFill } from "react-icons/go";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsGlobalAdmin } from "@/features/members/api/use-get-user-role";
import { usePermissionContext } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";

import { DottedSeparator } from "./dotted-separator";
import { CollapsibleSection } from "./collapsible-section";

export const Sidebar = () => {
  const pathname = usePathname();
  const { data: isAdmin, isLoading } = useIsGlobalAdmin();
  const { role } = usePermissionContext();
  const [expandedSections, setExpandedSections] = useState<string[]>(["Home", "Projects"]);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering role-specific content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((item) => item !== section)
        : [...prev, section]
    );
  };

  const isHomeActive = pathname === "/dashboard" || pathname === "/report" || pathname === "/profile" || pathname === "/edit-profile";
  const isProjectsActive = pathname === "/projects" || pathname === "/new-project" || pathname === "/tasks" || pathname === "/summary" || pathname === "/bugs";

  return (
    <aside className="h-full bg-muted/50 dark:bg-muted/30 p-4 w-full border-r border-border overflow-y-auto">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Image src="/logo.svg" alt="logo" width={50} height={39} />
        </Link>
        <p className="font-bold text-lg">GGS </p>
      </div>
      <DottedSeparator className="my-4" />
      
      {/* HOME Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection("Home")}
          className={cn(
            "flex items-center justify-between w-full gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
            isHomeActive && "text-primary"
          )}
        >
          <div className="flex items-center gap-2.5">
            {isHomeActive ? <GoHomeFill className="size-5 text-primary" /> : <GoHome className="size-5" />}
            Home
          </div>
          {expandedSections.includes("Home") ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {expandedSections.includes("Home") && (
          <nav className="flex flex-col gap-1 ml-4 mt-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                pathname === "/dashboard" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
              )}
            >
              <BarChart3 className="size-4" />
              Dashboard
            </Link>
            <Link
              href="/report"
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                pathname === "/report" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
              )}
            >
              <FileText className="size-4" />
              Report
            </Link>
            {mounted && isAdmin && (
              <>
                <Link
                  href="/profile"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/profile" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <User className="size-4" />
                  Add Profile
                </Link>
                <Link
                  href="/edit-profile"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/edit-profile" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <UserPen className="size-4" />
                  Edit Profile
                </Link>
              </>
            )}
          </nav>
        )}
      </div>

      {/* PROJECTS Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection("Projects")}
          className={cn(
            "flex items-center justify-between w-full gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
            isProjectsActive && "text-primary"
          )}
        >
          <div className="flex items-center gap-2.5">
            {isProjectsActive ? <GoCheckCircleFill className="size-5 text-primary" /> : <GoCheckCircle className="size-5" />}
            Projects
          </div>
          {expandedSections.includes("Projects") ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {expandedSections.includes("Projects") && (
          <nav className="flex flex-col gap-1 ml-4 mt-1">
            {mounted && isAdmin && role !== MemberRole.CLIENT && (
              <>
                <Link
                  href="/add-requirements"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/add-requirements" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <GoCheckCircle className="size-4" />
                  Add Requirements
                </Link>
                <Link
                  href="/new-project"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/new-project" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <PlusCircle className="size-4" />
                  Add Project
                </Link>
              </>
            )}
            <Link
              href="/tasks"
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                pathname === "/tasks" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
              )}
            >
              <GoalIcon className="size-4" />
              Add Tasks
            </Link>
            {role !== MemberRole.CLIENT && (
              <>
                <Link
                  href="/bugs"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/bugs" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <Bug className="size-4" />
                  Bug Tracker
                </Link>
                <Link
                  href="/summary"
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground",
                    pathname === "/summary" && "bg-background dark:bg-background shadow-sm text-primary border border-border"
                  )}
                >
                  <FileCheck className="size-4" />
                  Summary
                </Link>
              </>
            )}
          </nav>
        )}
      </div>

      {/* ATTENDANCE Section */}
      {role !== MemberRole.CLIENT && (
        <CollapsibleSection 
          title="Attendance" 
          icon={<Clock className="size-4" />}
          defaultOpen={false}
        >
        <nav className="flex flex-col gap-1 px-3">
          <Link
            href="/attendance"
            className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
          >
            <Clock className="size-4" />
            My Attendance
          </Link>
          {mounted && !isAdmin && (
            <Link
              href="/weekly-report"
              className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
            >
              <Calendar className="size-4" />
              Weekly Report
            </Link>
          )}
          {mounted && isAdmin && (
            <Link
              href="/report-download"
              className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
            >
              <FileText className="size-4" />
              Report Download
            </Link>
          )}
        </nav>
        </CollapsibleSection>
      )}

      {/* Solutions Section */}
      {role !== MemberRole.CLIENT && (
        <CollapsibleSection 
          title="Solutions" 
          icon={<Lightbulb className="size-4" />}
          defaultOpen={false}
        >
        <nav className="flex flex-col gap-1 px-3">
          <Link
            href="/solutions/pdf-xml"
            className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
          >
            <FileText className="size-4" />
            PDF to XML Extraction
          </Link>
          <Link
            href="/solutions/video-rag"
            className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
          >
            <Video className="size-4" />
            Video RAG
          </Link>
          <Link
            href="/solutions/chatbot"
            className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
          >
            <MessageSquare className="size-4" />
            Chatbot
          </Link>
          <Link
            href="/solutions/similarity"
            className="flex items-center gap-2.5 p-2.5 rounded-md font-medium hover:text-primary transition text-muted-foreground hover:bg-muted"
          >
            <GitCompare className="size-4" />
            Similarity Checkers
          </Link>
        </nav>
        </CollapsibleSection>
      )}

    </aside>
  );
};
