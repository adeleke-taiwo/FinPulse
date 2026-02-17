"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronDown, FolderTree, Users, Save } from "lucide-react";

interface DepartmentChild {
  id: string;
  name: string;
  code: string;
  children?: { id: string; name: string; code: string }[];
}

interface Department {
  id: string;
  name: string;
  code: string;
  subsidiary: { id: string; name: string; code: string } | null;
  parent: { id: string; name: string; code: string } | null;
  head: { id: string; firstName: string; lastName: string; email: string } | null;
  children: DepartmentChild[];
  _count: {
    members: number;
    costCenters: number;
    expenses: number;
    budgets: number;
  };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formSubsidiaryId, setFormSubsidiaryId] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formHeadUserId, setFormHeadUserId] = useState("");

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments");
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data);
        // Auto-expand all top-level departments
        const ids = new Set<string>(json.data.map((d: Department) => d.id));
        setExpanded(ids);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          code: formCode,
          subsidiaryId: formSubsidiaryId || undefined,
          parentId: formParentId || undefined,
          headUserId: formHeadUserId || undefined,
        }),
      });
      if (res.ok) {
        setFormName("");
        setFormCode("");
        setFormSubsidiaryId("");
        setFormParentId("");
        setFormHeadUserId("");
        setShowAddForm(false);
        fetchDepartments();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  // Flatten for parent selection dropdown
  function getAllDeptOptions(depts: Department[]): { id: string; name: string; code: string }[] {
    const options: { id: string; name: string; code: string }[] = [];
    for (const d of depts) {
      options.push({ id: d.id, name: d.name, code: d.code });
      if (d.children) {
        for (const c of d.children) {
          options.push({ id: c.id, name: c.name, code: c.code });
          if (c.children) {
            for (const gc of c.children) {
              options.push({ id: gc.id, name: gc.name, code: gc.code });
            }
          }
        }
      }
    }
    return options;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Departments</h1>
            <p className="text-sm text-muted-foreground">Manage department hierarchy</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const allDepts = getAllDeptOptions(departments);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {allDepts.length} departments configured
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-3 w-3" />
          Add Department
        </Button>
      </div>

      {/* Add department form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Finance"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. FIN"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Subsidiary ID
                  </label>
                  <input
                    type="text"
                    value={formSubsidiaryId}
                    onChange={(e) => setFormSubsidiaryId(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Parent Department
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">None (Top-level)</option>
                    {allDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Head User ID
                  </label>
                  <input
                    type="text"
                    value={formHeadUserId}
                    onChange={(e) => setFormHeadUserId(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="h-3 w-3" />
                  {saving ? "Creating..." : "Create Department"}
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

      {/* Department hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Department Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No departments found. Create your first department above.
            </p>
          ) : (
            <div className="space-y-1">
              {departments.map((dept) => (
                <DepartmentNode
                  key={dept.id}
                  dept={dept}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentNode({
  dept,
  depth,
  expanded,
  onToggle,
}: {
  dept: Department | DepartmentChild;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(dept.id);
  const hasChildren = dept.children && dept.children.length > 0;
  const fullDept = dept as Department;
  const hasMeta = "_count" in dept;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(dept.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <Badge variant="outline" className="font-mono text-xs">
          {dept.code}
        </Badge>
        <span className="font-medium text-foreground truncate max-w-[200px]">{dept.name}</span>

        {hasMeta && fullDept.subsidiary && (
          <Badge variant="default" className="text-[10px]">
            {fullDept.subsidiary.name}
          </Badge>
        )}

        {hasMeta && fullDept.head && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {fullDept.head.firstName} {fullDept.head.lastName}
          </span>
        )}

        {hasMeta && (
          <span className="text-xs text-muted-foreground">
            {fullDept._count.members} members
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {dept.children!.map((child) => (
            <DepartmentNode
              key={child.id}
              dept={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
