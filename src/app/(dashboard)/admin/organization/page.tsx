"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Plus, Pencil, Users, GitBranch, Shield } from "lucide-react";

interface Subsidiary {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
}

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  subsidiaries: Subsidiary[];
  _count: {
    members: number;
    departments: number;
    customRoles: number;
  };
}

export default function OrganizationPage() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Editable form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formPrimaryColor, setFormPrimaryColor] = useState("");

  // Add subsidiary form
  const [showAddSub, setShowAddSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subCountry, setSubCountry] = useState("");
  const [subCurrency, setSubCurrency] = useState("USD");

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organization");
      if (res.ok) {
        const json = await res.json();
        const data = json.data as OrganizationData;
        setOrg(data);
        setFormName(data.name);
        setFormSlug(data.slug);
        setFormLogoUrl(data.logoUrl || "");
        setFormPrimaryColor(data.primaryColor || "");
      }
    } catch {
      setError("Failed to load organization data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: org?.id,
          name: formName,
          slug: formSlug,
          logoUrl: formLogoUrl || null,
          primaryColor: formPrimaryColor || null,
        }),
      });
      if (res.ok) {
        setSuccessMsg("Settings saved successfully");
        fetchOrg();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setError("Failed to load organization data.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditSub(sub: Subsidiary) {
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubCode(sub.code);
    setSubCountry(sub.country);
    setSubCurrency(sub.currency);
    setShowAddSub(false);
  }

  function handleNewSub() {
    setEditingSubId(null);
    setSubName("");
    setSubCode("");
    setSubCountry("");
    setSubCurrency("USD");
    setShowAddSub(true);
  }

  function clearSubForm() {
    setShowAddSub(false);
    setEditingSubId(null);
    setSubName("");
    setSubCode("");
    setSubCountry("");
    setSubCurrency("USD");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organization Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your organization configuration</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your organization configuration</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{org._count.members}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <GitBranch className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{org._count.departments}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{org._count.customRoles}</p>
              <p className="text-xs text-muted-foreground">Custom Roles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org settings form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Slug
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formPrimaryColor || "#3b82f6"}
                    onChange={(e) => setFormPrimaryColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-input"
                  />
                  <input
                    type="text"
                    value={formPrimaryColor}
                    onChange={(e) => setFormPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={saving}>
                <Save className="h-3 w-3" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              {successMsg && (
                <span className="text-sm text-green-600">{successMsg}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subsidiaries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subsidiaries</CardTitle>
            <Button size="sm" variant="outline" onClick={handleNewSub}>
              <Plus className="h-3 w-3" />
              Add Subsidiary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(showAddSub || editingSubId) && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-sm font-semibold">
                {editingSubId ? "Edit Subsidiary" : "New Subsidiary"}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Code</label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Country</label>
                  <input
                    type="text"
                    value={subCountry}
                    onChange={(e) => setSubCountry(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Currency</label>
                  <input
                    type="text"
                    value={subCurrency}
                    onChange={(e) => setSubCurrency(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={async () => {
                  if (!subName || !subCode || !subCountry) return;
                  setSaving(true);
                  try {
                    const res = await fetch("/api/admin/organization", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        organizationId: org?.id,
                        subsidiaryId: editingSubId || undefined,
                        name: subName,
                        code: subCode,
                        country: subCountry,
                        currency: subCurrency,
                      }),
                    });
                    if (res.ok) {
                      clearSubForm();
                      fetchOrg();
                    }
                  } catch {
                    setError("Failed to save subsidiary.");
                  } finally {
                    setSaving(false);
                  }
                }} disabled={saving}>
                  <Save className="h-3 w-3" />
                  {editingSubId ? "Update" : "Create"}
                </Button>
                <Button size="sm" variant="outline" onClick={clearSubForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Country</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Currency</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.subsidiaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No subsidiaries configured
                    </td>
                  </tr>
                ) : (
                  org.subsidiaries.map((sub) => (
                    <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium text-foreground">{sub.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{sub.code}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sub.country}</td>
                      <td className="px-3 py-2 text-muted-foreground">{sub.currency}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleEditSub(sub)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
