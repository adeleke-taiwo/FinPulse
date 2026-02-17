"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  X,
  GitPullRequest,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowDown,
} from "lucide-react";
import { toTitleCase } from "@/lib/utils";

const WORKFLOW_TYPES = [
  "EXPENSE_APPROVAL",
  "BUDGET_REQUEST",
  "JOURNAL_APPROVAL",
  "VENDOR_ONBOARDING",
  "INVOICE_APPROVAL",
];

const APPROVER_ROLES = [
  "SUPER_ADMIN",
  "CFO",
  "FINANCE_MANAGER",
  "DEPARTMENT_HEAD",
  "ANALYST",
  "EMPLOYEE",
  "AUDITOR",
  "EXTERNAL_ACCOUNTANT",
];

interface WorkflowStep {
  id: string;
  stepOrder: number;
  name: string;
  approverRole: string;
  condition: Record<string, unknown> | null;
}

interface WorkflowTemplate {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  config: Record<string, unknown> | null;
  steps: WorkflowStep[];
  _count?: {
    instances: number;
  };
}

// Step input for the add form
interface StepInput {
  localId: string;
  stepOrder: number;
  name: string;
  approverRole: string;
  conditionJson: string;
}

export default function WorkflowsPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add workflow form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(WORKFLOW_TYPES[0]);
  const [newSteps, setNewSteps] = useState<StepInput[]>([
    { localId: "step-1", stepOrder: 1, name: "", approverRole: "DEPARTMENT_HEAD", conditionJson: "" },
  ]);

  const fetchTemplates = useCallback(async () => {
    try {
      // Attempt to fetch from approvals API; fall back to mock data
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const json = await res.json();
        // If the response has templates, use them; otherwise use mock data
        if (json.templates) {
          setTemplates(json.templates);
        } else {
          // Use mock data based on common workflow patterns
          setTemplates([
            {
              id: "wft-1",
              type: "EXPENSE_APPROVAL",
              name: "Expense Approval Workflow",
              isActive: true,
              config: null,
              steps: [
                { id: "s1", stepOrder: 1, name: "Manager Review", approverRole: "DEPARTMENT_HEAD", condition: null },
                { id: "s2", stepOrder: 2, name: "Finance Review", approverRole: "FINANCE_MANAGER", condition: { minAmount: 1000 } },
                { id: "s3", stepOrder: 3, name: "CFO Approval", approverRole: "CFO", condition: { minAmount: 5000 } },
              ],
            },
            {
              id: "wft-2",
              type: "JOURNAL_APPROVAL",
              name: "Journal Entry Approval",
              isActive: true,
              config: null,
              steps: [
                { id: "s4", stepOrder: 1, name: "Finance Manager Review", approverRole: "FINANCE_MANAGER", condition: null },
                { id: "s5", stepOrder: 2, name: "CFO Final Approval", approverRole: "CFO", condition: { minAmount: 10000 } },
              ],
            },
            {
              id: "wft-3",
              type: "VENDOR_ONBOARDING",
              name: "Vendor Onboarding",
              isActive: true,
              config: null,
              steps: [
                { id: "s6", stepOrder: 1, name: "Compliance Check", approverRole: "FINANCE_MANAGER", condition: null },
                { id: "s7", stepOrder: 2, name: "Final Approval", approverRole: "CFO", condition: null },
              ],
            },
          ]);
        }
      }
    } catch {
      // Use mock data on error
      setTemplates([
        {
          id: "wft-1",
          type: "EXPENSE_APPROVAL",
          name: "Expense Approval Workflow",
          isActive: true,
          config: null,
          steps: [
            { id: "s1", stepOrder: 1, name: "Manager Review", approverRole: "DEPARTMENT_HEAD", condition: null },
            { id: "s2", stepOrder: 2, name: "Finance Review", approverRole: "FINANCE_MANAGER", condition: { minAmount: 1000 } },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function addStep() {
    const nextOrder = newSteps.length + 1;
    setNewSteps([
      ...newSteps,
      {
        localId: crypto.randomUUID(),
        stepOrder: nextOrder,
        name: "",
        approverRole: "FINANCE_MANAGER",
        conditionJson: "",
      },
    ]);
  }

  function removeStep(localId: string) {
    const updated = newSteps
      .filter((s) => s.localId !== localId)
      .map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setNewSteps(updated);
  }

  function updateStep(localId: string, field: keyof StepInput, value: string | number) {
    setNewSteps(
      newSteps.map((s) => (s.localId === localId ? { ...s, [field]: value } : s))
    );
  }

  async function handleCreateWorkflow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // In a real implementation, this would POST to an API
    // For now, add it to local state
    let parsedSteps;
    try {
      parsedSteps = newSteps.map((s) => ({
        id: crypto.randomUUID(),
        stepOrder: s.stepOrder,
        name: s.name,
        approverRole: s.approverRole,
        condition: s.conditionJson ? JSON.parse(s.conditionJson) : null,
      }));
    } catch {
      setSaving(false);
      return;
    }
    const newTemplate: WorkflowTemplate = {
      id: crypto.randomUUID(),
      type: newType,
      name: newName,
      isActive: true,
      config: null,
      steps: parsedSteps,
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setShowAddForm(false);
    setNewName("");
    setNewType(WORKFLOW_TYPES[0]);
    setNewSteps([
      { localId: crypto.randomUUID(), stepOrder: 1, name: "", approverRole: "DEPARTMENT_HEAD", conditionJson: "" },
    ]);
    setSaving(false);
  }

  const typeVariant: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
    EXPENSE_APPROVAL: "warning",
    BUDGET_REQUEST: "default",
    JOURNAL_APPROVAL: "success",
    VENDOR_ONBOARDING: "outline",
    INVOICE_APPROVAL: "destructive",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflow Templates</h1>
            <p className="text-sm text-muted-foreground">Configure approval workflows</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Templates</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} workflow templates configured
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-3 w-3" />
          Add Workflow
        </Button>
      </div>

      {/* Add workflow form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Workflow Template</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Expense Approval"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Workflow Type *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {WORKFLOW_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {toTitleCase(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Steps editor */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Approval Steps
                </label>
                <div className="space-y-2">
                  {newSteps.map((step, index) => (
                    <div key={step.localId}>
                      {index > 0 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {step.stepOrder}
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-0.5 block text-[10px] text-muted-foreground">
                              Step Name
                            </label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => updateStep(step.localId, "name", e.target.value)}
                              placeholder="e.g. Manager Review"
                              className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] text-muted-foreground">
                              Approver Role
                            </label>
                            <select
                              value={step.approverRole}
                              onChange={(e) => updateStep(step.localId, "approverRole", e.target.value)}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            >
                              {APPROVER_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {toTitleCase(r)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] text-muted-foreground">
                              Condition (JSON)
                            </label>
                            <input
                              type="text"
                              value={step.conditionJson}
                              onChange={(e) => updateStep(step.localId, "conditionJson", e.target.value)}
                              placeholder='e.g. {"minAmount": 5000}'
                              className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                        {newSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(step.localId)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={addStep}
                >
                  <Plus className="h-3 w-3" />
                  Add Step
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="h-3 w-3" />
                  {saving ? "Creating..." : "Create Workflow"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      <div className="space-y-3">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <GitPullRequest className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No workflow templates configured yet
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <div
                className="flex cursor-pointer items-center justify-between px-6 py-4"
                onClick={() =>
                  setExpandedId(expandedId === template.id ? null : template.id)
                }
              >
                <div className="flex items-center gap-3">
                  {expandedId === template.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-medium text-foreground">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={typeVariant[template.type] || "outline"}>
                        {toTitleCase(template.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {template.steps.length} steps
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={template.isActive ? "success" : "outline"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {expandedId === template.id && (
                <div className="border-t border-border px-6 pb-4 pt-3">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Approval Steps
                  </h4>
                  <div className="space-y-2">
                    {template.steps
                      .sort((a, b) => a.stepOrder - b.stepOrder)
                      .map((step, index) => (
                        <div key={step.id}>
                          {index > 0 && (
                            <div className="flex justify-center py-0.5">
                              <ArrowDown className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {step.stepOrder}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{step.name}</span>
                            </div>
                            <Badge variant="outline">
                              {toTitleCase(step.approverRole)}
                            </Badge>
                            {step.condition && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {JSON.stringify(step.condition)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
