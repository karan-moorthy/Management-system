"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetNotifications, useGetUnreadCount } from "../api/use-get-notifications";
import { useMarkNotificationRead } from "../api/use-mark-notification-read";
import { useMarkAllNotificationsRead } from "../api/use-mark-all-read";
import { useClearAllNotifications } from "../api/use-clear-all-notifications";
import { useDeleteNotification } from "../api/use-delete-notification";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export const NotificationButton = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useGetNotifications();
  const unreadCount = useGetUnreadCount();
  const { mutate: markAsRead } = useMarkNotificationRead();
  const { mutate: markAllAsRead } = useMarkAllNotificationsRead();
  const { mutate: clearAll, isPending: isClearing } = useClearAllNotifications();
  const { mutate: deleteNotification } = useDeleteNotification();

  console.log("🔔 Notifications loaded:", notifications.length, "Unread:", unreadCount);

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (notification.isRead === "false") {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === "TASK_IN_REVIEW") {
      // Navigate to tasks page with reviews tab
      router.push("/tasks?tab=overviews");
      setOpen(false);
    } else if (notification.type === "TASK_APPROVED" || notification.type === "TASK_REWORK") {
      // Navigate to the specific task
      if (notification.taskId) {
        router.push(`/tasks?taskId=${notification.taskId}`);
        setOpen(false);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all notifications? This action cannot be undone.")) {
      clearAll();
    }
  };

  const getRelativeTime = (date: string | Date) => {
    try {
      // Parse the date and ensure we're working with the correct timestamp
      const notificationDate = new Date(date);
      
      // Check if date is valid
      if (isNaN(notificationDate.getTime())) {
        console.error("Invalid date:", date);
        return "just now";
      }
      
      return formatDistanceToNow(notificationDate, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "just now";
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent notification click
    deleteNotification(notificationId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary hover:underline"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-destructive hover:underline"
                onClick={handleClearAll}
                disabled={isClearing}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={cn(
                    "relative group hover:bg-muted/50 transition-colors",
                    notification.isRead === "false" && "bg-primary/5"
                  )}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                        notification.isRead === "false" ? "bg-primary" : "bg-transparent"
                      )} />
                      <div className="flex-1 space-y-1 pr-8">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
