import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { TaskStatus } from "@/features/tasks/types";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        [TaskStatus.TODO]:
          "border-[hsl(var(--status-todo-border))]/30 bg-[hsl(var(--status-todo-bg))]/10 text-[hsl(var(--status-todo))] hover:bg-[hsl(var(--status-todo-bg))]/20",
        [TaskStatus.IN_PROGRESS]:
          "border-[hsl(var(--status-in-progress-border))]/30 bg-[hsl(var(--status-in-progress-bg))]/10 text-[hsl(var(--status-in-progress))] hover:bg-[hsl(var(--status-in-progress-bg))]/20",
        [TaskStatus.IN_REVIEW]:
          "border-[hsl(var(--status-in-review-border))]/30 bg-[hsl(var(--status-in-review-bg))]/10 text-[hsl(var(--status-in-review))] hover:bg-[hsl(var(--status-in-review-bg))]/20",
        [TaskStatus.DONE]:
          "border-[hsl(var(--status-done-border))]/30 bg-[hsl(var(--status-done-bg))]/10 text-[hsl(var(--status-done))] hover:bg-[hsl(var(--status-done-bg))]/20",
        [TaskStatus.BACKLOG]:
          "border-[hsl(var(--status-backlog-border))]/30 bg-[hsl(var(--status-backlog-bg))]/10 text-[hsl(var(--status-backlog))] hover:bg-[hsl(var(--status-backlog-bg))]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
