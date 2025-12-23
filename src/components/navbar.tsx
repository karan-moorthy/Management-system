"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { NotificationButton } from "@/features/notifications/components/notification-button";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { MobileSidebar } from "./mobile-sidebar";

const pathnameMap = {
  tasks: {
    title: "My Tasks",
    description: "View all of your tasks here.",
  },
  projects: {
    title: "My Project",
    description: "View tasks of your project here.",
  },
};

const defaultMap = {
  title: "Home",
  description: "Monitor all of your projects and tasks here.",
  clientTitle: "Client View",
  clientDescription: "View your project progress and tasks.",
};

export const Navbar = () => {
  const pathname = usePathname();
  const pathnameParts = pathname.split("/");
  const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;

  const { title, description } = pathnameMap[pathnameKey] || defaultMap;
  
  // Check if user is CLIENT
  const { data: roleData } = useGetCurrentUserRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isClient = roleData?.role === "CLIENT";
  
  // Show client-specific title and description or regular ones
  const displayTitle = mounted && isClient ? defaultMap.clientTitle : title;
  const displayDescription = mounted ? (
    isClient ? defaultMap.clientDescription : description
  ) : null;

  return (
    <nav className="pt-4 px-6 flex items-center justify-between">
      <div className="flex-col hidden lg:flex">
        <h1 className="text-2xl font-semibold">{displayTitle}</h1>
        {displayDescription && <p className="text-muted-foreground">{displayDescription}</p>}
      </div>
      <MobileSidebar />
      <div className="flex items-center gap-2">
        <NotificationButton />
        <UserButton />
      </div>
    </nav>
  );
};
