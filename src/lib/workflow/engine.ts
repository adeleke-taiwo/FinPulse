import { prisma } from "@/lib/db";
import type { WorkflowStatus, WorkflowStepStatus } from "@prisma/client";

export async function startWorkflow(input: {
  templateId: string;
  resourceType: string;
  resourceId: string;
  submittedById: string;
}) {
  const template = await prisma.workflowTemplate.findUniqueOrThrow({
    where: { id: input.templateId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  if (!template.isActive) {
    throw new Error("Workflow template is not active");
  }

  if (template.steps.length === 0) {
    throw new Error("Workflow template has no steps");
  }

  const instance = await prisma.workflowInstance.create({
    data: {
      templateId: input.templateId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      submittedById: input.submittedById,
      status: "IN_PROGRESS",
      currentStep: 1,
      stepActions: {
        create: template.steps.map((step) => ({
          stepOrder: step.stepOrder,
          status: step.stepOrder === 1 ? "PENDING" : "PENDING",
        })),
      },
    },
    include: { stepActions: true },
  });

  return instance;
}

export async function processApproval(input: {
  instanceId: string;
  stepOrder: number;
  actorId: string;
  status: "APPROVED" | "REJECTED";
  comment?: string;
}) {
  const instance = await prisma.workflowInstance.findUniqueOrThrow({
    where: { id: input.instanceId },
    include: {
      template: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      stepActions: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (instance.status !== "IN_PROGRESS") {
    throw new Error("Workflow is not in progress");
  }

  if (input.stepOrder !== instance.currentStep) {
    throw new Error(`Expected step ${instance.currentStep}, got ${input.stepOrder}`);
  }

  // Update the step action
  const stepAction = instance.stepActions.find((a) => a.stepOrder === input.stepOrder);
  if (!stepAction) throw new Error("Step action not found");

  await prisma.workflowStepAction.update({
    where: { id: stepAction.id },
    data: {
      actorId: input.actorId,
      status: input.status as WorkflowStepStatus,
      comment: input.comment,
      actedAt: new Date(),
    },
  });

  if (input.status === "REJECTED") {
    // Reject the entire workflow
    await prisma.workflowInstance.update({
      where: { id: input.instanceId },
      data: { status: "REJECTED" },
    });
    return { status: "REJECTED" as WorkflowStatus, nextStep: null };
  }

  // Check if there's a next step
  const totalSteps = instance.template.steps.length;
  const nextStep = input.stepOrder + 1;

  if (nextStep > totalSteps) {
    // All steps approved
    await prisma.workflowInstance.update({
      where: { id: input.instanceId },
      data: { status: "APPROVED", currentStep: totalSteps },
    });
    return { status: "APPROVED" as WorkflowStatus, nextStep: null };
  }

  // Advance to next step
  await prisma.workflowInstance.update({
    where: { id: input.instanceId },
    data: { currentStep: nextStep },
  });

  return { status: "IN_PROGRESS" as WorkflowStatus, nextStep };
}

export async function cancelWorkflow(instanceId: string) {
  return prisma.workflowInstance.update({
    where: { id: instanceId },
    data: { status: "CANCELLED" },
  });
}

export async function getWorkflowForResource(
  resourceType: string,
  resourceId: string
) {
  return prisma.workflowInstance.findFirst({
    where: { resourceType, resourceId },
    include: {
      template: { include: { steps: true } },
      stepActions: {
        orderBy: { stepOrder: "asc" },
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      },
      submittedBy: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingApprovals(userId: string, organizationId: string) {
  // Get the user's org membership to determine their role
  const member = await prisma.orgMember.findFirst({
    where: { userId, organizationId },
  });

  if (!member) return [];

  // Find workflow instances where current step matches the user's role
  const instances = await prisma.workflowInstance.findMany({
    where: {
      status: "IN_PROGRESS",
      template: { organizationId },
    },
    include: {
      template: { include: { steps: true } },
      stepActions: { orderBy: { stepOrder: "asc" } },
      submittedBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Filter to only instances where current step's approver role matches
  return instances.filter((inst) => {
    const currentStepTemplate = inst.template.steps.find(
      (s) => s.stepOrder === inst.currentStep
    );
    return currentStepTemplate?.approverRole === member.role;
  });
}
