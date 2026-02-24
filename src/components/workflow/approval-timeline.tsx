"use client";

import { Check, X, Clock, User } from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";

interface StepAction {
  stepOrder: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELEGATED";
  comment?: string | null;
  actedAt?: string | null;
  actor?: { firstName: string; lastName: string; email: string } | null;
}

interface WorkflowStep {
  stepOrder: number;
  name: string;
  approverRole: string;
}

interface ApprovalTimelineProps {
  steps: WorkflowStep[];
  actions: StepAction[];
  currentStep: number;
  submittedBy: { firstName: string; lastName: string };
  submittedAt: string;
}

export function ApprovalTimeline({
  steps,
  actions,
  currentStep,
  submittedBy,
  submittedAt,
}: ApprovalTimelineProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold">Approval Timeline</h3>

      <div className="space-y-0">
        {/* Submission step */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            {steps.length > 0 && <div className="mt-1 h-full w-0.5 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium">Submitted</p>
            <p className="text-xs text-muted-foreground">
              by {submittedBy.firstName} {submittedBy.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(submittedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Approval steps */}
        {steps.map((step, i) => {
          const action = actions.find((a) => a.stepOrder === step.stepOrder);
          const isActive = step.stepOrder === currentStep;
          const isDone = action?.status === "APPROVED" || action?.status === "REJECTED";

          let icon;
          let bgColor;
          if (action?.status === "APPROVED") {
            icon = <Check className="h-4 w-4" />;
            bgColor = "bg-green-500 text-white";
          } else if (action?.status === "REJECTED") {
            icon = <X className="h-4 w-4" />;
            bgColor = "bg-destructive text-white";
          } else if (isActive) {
            icon = <Clock className="h-4 w-4" />;
            bgColor = "bg-amber-500 text-white";
          } else {
            icon = <span className="text-xs font-medium">{step.stepOrder}</span>;
            bgColor = "bg-muted text-muted-foreground";
          }

          return (
            <div key={step.stepOrder} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", bgColor)}>
                  {icon}
                </div>
                {i < steps.length - 1 && <div className="mt-1 h-full w-0.5 bg-border" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium">{step.name}</p>
                <p className="text-xs text-muted-foreground">
                  Required: {toTitleCase(step.approverRole)}
                </p>
                {isDone && action?.actor && (
                  <p className="text-xs text-muted-foreground">
                    {action.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                    {action.actor.firstName} {action.actor.lastName}
                  </p>
                )}
                {action?.comment && (
                  <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-xs italic">
                    &ldquo;{action.comment}&rdquo;
                  </p>
                )}
                {action?.actedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(action.actedAt).toLocaleString()}
                  </p>
                )}
                {isActive && !isDone && (
                  <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Awaiting Approval
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
