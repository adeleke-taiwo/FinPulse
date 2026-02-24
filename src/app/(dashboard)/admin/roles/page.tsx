"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermissionMatrix } from "@/components/ui/permission-matrix";
import { DEFAULT_PERMISSIONS } from "@/types/permissions";
import type { PermissionMap } from "@/types/permissions";
import { Shield, Plus, Save, X, Users } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

type OrgRole = keyof typeof DEFAULT_PERMISSIONS;

interface CustomRole {
  id: string;
  name: string;
  permissions: PermissionMap;
  _count: {
    members: number;
  };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View state
  const [selectedDefaultRole, setSelectedDefaultRole] = useState<OrgRole | null>(null);
  const [selectedCustomRole, setSelectedCustomRole] = useState<CustomRole | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<PermissionMap>({});
  const [editingName, setEditingName] = useState("");

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermissions, setNewPermissions] = useState<PermissionMap>({});
  const [, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.data);
      }
    } catch {
      setError("Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function handleSelectDefault(role: OrgRole) {
    setSelectedDefaultRole(role);
    setSelectedCustomRole(null);
    setShowAddForm(false);
  }

  function handleSelectCustom(role: CustomRole) {
    setSelectedCustomRole(role);
    setSelectedDefaultRole(null);
    setEditingPermissions(role.permissions as PermissionMap);
    setEditingName(role.name);
    setShowAddForm(false);
  }

  function handleStartAdd() {
    setShowAddForm(true);
    setSelectedDefaultRole(null);
    setSelectedCustomRole(null);
    setNewRoleName("");
    setNewPermissions({});
  }

  async function handleSaveCustomRole() {
    if (!selectedCustomRole) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedCustomRole.id,
          name: editingName,
          permissions: editingPermissions,
        }),
      });
      if (res.ok) {
        fetchRoles();
        setSelectedCustomRole(null);
      }
    } catch {
      setError("Failed to save role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          permissions: newPermissions,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewRoleName("");
        setNewPermissions({});
        fetchRoles();
      }
    } catch {
      setError("Failed to create role.");
    } finally {
      setSaving(false);
    }
  }

  const defaultRoles = Object.keys(DEFAULT_PERMISSIONS) as OrgRole[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Manage access control for your organization</p>
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
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage access control for your organization</p>
        </div>
        <Button size="sm" onClick={handleStartAdd}>
          <Plus className="h-3 w-3" />
          Create Custom Role
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Role list sidebar */}
        <div className="space-y-4">
          {/* Default roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Default Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {defaultRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleSelectDefault(role)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedDefaultRole === role
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span className="font-medium">{toTitleCase(role)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    built-in
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Custom roles */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {roles.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  No custom roles yet
                </p>
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectCustom(role)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedCustomRole?.id === role.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className="font-medium">{role.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {role._count.members}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Permission matrix viewer */}
        <div className="lg:col-span-3">
          {/* Default role view (read-only) */}
          {selectedDefaultRole && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {toTitleCase(selectedDefaultRole)} Permissions
                  </CardTitle>
                  <Badge variant="outline">Read Only</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PermissionMatrix
                  permissions={DEFAULT_PERMISSIONS[selectedDefaultRole]}
                  onChange={() => {}}
                  readOnly
                />
              </CardContent>
            </Card>
          )}

          {/* Custom role view (editable) */}
          {selectedCustomRole && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Edit Custom Role</CardTitle>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveCustomRole} disabled={saving}>
                      <Save className="h-3 w-3" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCustomRole(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PermissionMatrix
                  permissions={editingPermissions}
                  onChange={setEditingPermissions}
                />
              </CardContent>
            </Card>
          )}

          {/* Create new role form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Custom Role</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g. Budget Reviewer"
                      className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Permissions
                    </label>
                    <PermissionMatrix
                      permissions={newPermissions}
                      onChange={setNewPermissions}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={saving}>
                    <Save className="h-3 w-3" />
                    {saving ? "Creating..." : "Create Role"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!selectedDefaultRole && !selectedCustomRole && !showAddForm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Shield className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a role from the sidebar to view or edit permissions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
