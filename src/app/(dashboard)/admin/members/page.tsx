"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Search, UserPlus, Save, X } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  title: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  department: { id: string; name: string; code: string } | null;
  customRole: { id: string; name: string; permissions: unknown } | null;
  manager: {
    id: string;
    user: { firstName: string; lastName: string };
  } | null;
}

interface MembersData {
  data: Member[];
  total: number;
  page: number;
  totalPages: number;
}

const ROLES = [
  "SUPER_ADMIN",
  "CFO",
  "FINANCE_MANAGER",
  "DEPARTMENT_HEAD",
  "ANALYST",
  "EMPLOYEE",
  "AUDITOR",
  "EXTERNAL_ACCOUNTANT",
];

const roleVariant: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  SUPER_ADMIN: "destructive",
  CFO: "warning",
  FINANCE_MANAGER: "success",
  DEPARTMENT_HEAD: "default",
  ANALYST: "outline",
  EMPLOYEE: "outline",
  AUDITOR: "outline",
  EXTERNAL_ACCOUNTANT: "outline",
};

export default function MembersPage() {
  const [data, setData] = useState<MembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Add member
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("EMPLOYEE");
  const [addDepartmentId, setAddDepartmentId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Change role
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/admin/members?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: addUserId,
          role: addRole,
          departmentId: addDepartmentId || undefined,
          title: addTitle || undefined,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setAddUserId("");
        setAddRole("EMPLOYEE");
        setAddDepartmentId("");
        setAddTitle("");
        fetchMembers();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeRole(memberId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          role: editRole,
        }),
      });
      if (res.ok) {
        setEditingMemberId(null);
        fetchMembers();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        return (
          <div>
            <span className="font-medium text-foreground">
              {member.user.firstName} {member.user.lastName}
            </span>
            {!member.user.isActive && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                Inactive
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "email",
      label: "Email",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        return (
          <span className="text-sm text-muted-foreground truncate block max-w-[200px]">{member.user.email}</span>
        );
      },
    },
    {
      key: "role",
      label: "Role",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        if (editingMemberId === member.id) {
          return (
            <div className="flex items-center gap-2">
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {toTitleCase(r)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleChangeRole(member.id)}
                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => setEditingMemberId(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={() => {
              setEditingMemberId(member.id);
              setEditRole(member.role);
            }}
            className="cursor-pointer"
          >
            <Badge variant={roleVariant[member.role] || "outline"}>
              {toTitleCase(member.role)}
            </Badge>
          </button>
        );
      },
    },
    {
      key: "department",
      label: "Department",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        return member.department ? (
          <span className="text-sm">
            {member.department.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{"\u2014"}</span>
        );
      },
    },
    {
      key: "title",
      label: "Title",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        return (
          <span className="text-sm text-muted-foreground">
            {member.title || "\u2014"}
          </span>
        );
      },
    },
    {
      key: "customRole",
      label: "Custom Role",
      render: (row: Record<string, unknown>) => {
        const member = row as unknown as Member;
        return member.customRole ? (
          <Badge variant="outline">{member.customRole.name}</Badge>
        ) : (
          <span className="text-muted-foreground">{"\u2014"}</span>
        );
      },
    },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground">Manage organization members</p>
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
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total.toLocaleString() || 0} members in the organization
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="h-3 w-3" />
          Add Member
        </Button>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    User ID *
                  </label>
                  <input
                    type="text"
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    placeholder="User ID"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {toTitleCase(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Department ID
                  </label>
                  <input
                    type="text"
                    value={addDepartmentId}
                    onChange={(e) => setAddDepartmentId(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Title
                  </label>
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. Senior Accountant"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="h-3 w-3" />
                  {saving ? "Adding..." : "Add Member"}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {toTitleCase(r)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
