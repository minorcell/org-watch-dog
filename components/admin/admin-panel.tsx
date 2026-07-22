"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Person, RepoDetail } from "@/lib/database";

/* ── Modal ──────────────────────────────────────────────────── */

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="关闭" />
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border bg-card p-5 shadow-[0_16px_48px_rgb(0_0_0/15%)]">
        <h2 className="mb-4 text-sm font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ── Person form ────────────────────────────────────────────── */

function PersonForm({ initial, onSave, onCancel, saving }: { initial?: Person; onSave: (githubId: string, realName: string) => void; onCancel: () => void; saving: boolean }) {
  const [githubId, setGithubId] = useState(initial?.githubId ?? "");
  const [realName, setRealName] = useState(initial?.realName ?? "");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (githubId.trim() && realName.trim()) onSave(githubId.trim(), realName.trim()); }} className="grid gap-3">
      <label className="grid gap-1 text-[11px] font-medium">GitHub ID *<input value={githubId} onChange={(e) => setGithubId(e.target.value)} className="h-8 rounded-md border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring" required autoFocus /></label>
      <label className="grid gap-1 text-[11px] font-medium">真实姓名 *<input value={realName} onChange={(e) => setRealName(e.target.value)} className="h-8 rounded-md border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring" required /></label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-accent">取消</button>
        <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40">{saving && <LoaderCircle className="size-3 animate-spin" />}{initial ? "保存" : "创建"}</button>
      </div>
    </form>
  );
}

/* ── Repo form ──────────────────────────────────────────────── */

function RepoForm({ initial, people, onSave, onCancel, saving }: { initial?: RepoDetail; people: Person[]; onSave: (data: { githubRepo: string; members: { personId: number; role: string }[] }) => void; onCancel: () => void; saving: boolean }) {
  const [githubRepo, setGithubRepo] = useState(initial?.githubRepo ?? "");
  const [mentorId, setMentorId] = useState(String(initial?.members.find((m) => m.role === "mentor")?.personId ?? ""));
  const [assistantId, setAssistantId] = useState(String(initial?.members.find((m) => m.role === "assistant")?.personId ?? ""));
  const [leadId, setLeadId] = useState(String(initial?.members.find((m) => m.role === "lead")?.personId ?? ""));
  const [memberIds, setMemberIds] = useState<Set<number>>(new Set(initial?.members.filter((m) => m.role === "member").map((m) => m.personId) ?? []));

  function toggleMember(id: number) { setMemberIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!githubRepo.trim()) return;
    const members: { personId: number; role: string }[] = [];
    if (mentorId) members.push({ personId: Number(mentorId), role: "mentor" });
    if (assistantId) members.push({ personId: Number(assistantId), role: "assistant" });
    if (leadId) members.push({ personId: Number(leadId), role: "lead" });
    memberIds.forEach((id) => members.push({ personId: id, role: "member" }));
    onSave({ githubRepo: githubRepo.trim(), members });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="grid gap-1 text-[11px] font-medium">GitHub 仓库 *<input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className="h-8 rounded-md border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono" placeholder="1024XEngineer/RepoName" required autoFocus /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-[11px] font-medium">导师 <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className="h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"><option value="">选择</option>{people.map((p) => <option key={p.id} value={p.id}>{p.realName} ({p.githubId})</option>)}</select></label>
        <label className="grid gap-1 text-[11px] font-medium">助教 <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className="h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"><option value="">选择</option>{people.map((p) => <option key={p.id} value={p.id}>{p.realName} ({p.githubId})</option>)}</select></label>
      </div>
      <label className="grid gap-1 text-[11px] font-medium">组长 <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"><option value="">选择（可选）</option>{people.map((p) => <option key={p.id} value={p.id}>{p.realName} ({p.githubId})</option>)}</select></label>
      <fieldset className="grid gap-1">
        <legend className="text-[11px] font-medium">组员</legend>
        <div className="max-h-32 overflow-y-auto rounded-md border p-2 grid gap-0.5">
          {people.map((p) => (<label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent cursor-pointer"><input type="checkbox" checked={memberIds.has(p.id)} onChange={() => toggleMember(p.id)} className="size-3.5" />{p.realName} <span className="text-muted-foreground">({p.githubId})</span></label>))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-accent">取消</button>
        <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40">{saving && <LoaderCircle className="size-3 animate-spin" />}{initial ? "保存" : "创建"}</button>
      </div>
    </form>
  );
}

/* ── Main panel ─────────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = { mentor: "导师", assistant: "助教", lead: "组长", member: "组员" };
const ROLE_ORDER = ["mentor", "assistant", "lead", "member"];

export function AdminPanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [repos, setRepos] = useState<RepoDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formMode, setFormMode] = useState<"person" | "repo" | null>(null);
  const [editing, setEditing] = useState<Person | RepoDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "person" | "repo"; id: number; name: string } | null>(null);

  // Import
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Expand
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, rRes] = await Promise.all([fetch("/api/admin/people"), fetch("/api/admin/repos")]);
    if (pRes.ok) setPeople(await pRes.json());
    if (rRes.ok) {
      const list = await rRes.json();
      // Fetch detail for each to get members
      const details = await Promise.all(list.map((r: { githubRepo: string }) =>
        fetch(`/api/admin/repos?detail=${encodeURIComponent(r.githubRepo)}`).then((res) => res.ok ? res.json() : null)
      ));
      setRepos(details.filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSavePerson(githubId: string, realName: string) {
    setSaving(true);
    const isEdit = editing && "githubId" in editing;
    const url = isEdit ? `/api/admin/people/${(editing as Person).id}` : "/api/admin/people";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ githubId, realName }) });
    if (res.ok) { setFormMode(null); setEditing(null); await fetchData(); }
    setSaving(false);
  }

  async function handleSaveRepo(data: { githubRepo: string; members: { personId: number; role: string }[] }) {
    setSaving(true);
    const isEdit = editing && "githubRepo" in editing;
    const url = isEdit ? "/api/admin/repos" : "/api/admin/repos";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ githubRepo: data.githubRepo, members: data.members }) });
    if (res.ok) { setFormMode(null); setEditing(null); await fetchData(); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "person") {
      await fetch(`/api/admin/people/${deleteTarget.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/repos?repo=${encodeURIComponent(deleteTarget.name)}`, { method: "DELETE" });
    }
    setDeleteTarget(null);
    await fetchData();
  }

  async function handleImport() {
    setImporting(true);
    setImportMsg("");
    const res = await fetch("/api/admin/import", { method: "POST" });
    const data = await res.json();
    setImportMsg(res.ok ? `导入完成：${data.repos} 个仓库，${data.people} 人` : (data.message ?? "导入失败"));
    if (res.ok) await fetchData();
    setImporting(false);
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl py-16 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">加载中…</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">组织管理</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">管理仓库与人员</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleImport} disabled={importing} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-accent disabled:opacity-40">{importing ? <LoaderCircle className="size-3 animate-spin" /> : <Upload className="size-3" />}从 YAML 导入</button>
          <button type="button" onClick={() => { setEditing(null); setFormMode("repo"); }} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"><Plus className="size-3" />添加仓库</button>
        </div>
      </div>

      {importMsg && <div className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-500">{importMsg}</div>}

      {/* ── Repo list ── */}
      <section className="mb-6 overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-5 py-3"><h2 className="text-sm font-semibold">仓库</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-8 w-8 px-3 text-[11px] font-medium text-muted-foreground first:pl-4" />
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">仓库</th>
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">描述</th>
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">导师</th>
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">助教</th>
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">成员</th>
                <th className="h-8 w-24 px-3 text-[11px] font-medium text-muted-foreground last:pr-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {repos.length === 0 ? (
                <tr><td colSpan={7} className="h-24 text-center text-xs text-muted-foreground">暂无仓库，点击「从 YAML 导入」或「添加仓库」</td></tr>
              ) : repos.map((r) => {
                const isExpanded = expandedRepo === r.githubRepo;
                const mentor = r.members.find((m) => m.role === "mentor");
                const assistant = r.members.find((m) => m.role === "assistant");
                const memberList = r.members.filter((m) => m.role === "member" || m.role === "lead");
                return (
                  <tr key={r.githubRepo} className={`border-b border-border/50 last:border-0 ${isExpanded ? "bg-muted/10" : ""}`}>
                    <td className="h-10 px-3 first:pl-4">
                      <button type="button" onClick={() => setExpandedRepo(isExpanded ? null : r.githubRepo)} className="grid size-6 place-items-center rounded hover:bg-accent">{isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}</button>
                    </td>
                    <td className="h-10 px-3">
                      <span className="text-xs font-medium font-mono">{r.githubRepo.split("/")[1]}</span>
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{r.language ? `· ${r.language}` : ""}{r.archived ? " · archived" : ""}</span>
                    </td>
                    <td className="h-10 px-3 text-xs text-muted-foreground max-w-64 truncate">{r.description ?? "-"}</td>
                    <td className="h-10 px-3 text-xs">{mentor ? <span className="font-medium">{mentor.realName}</span> : "-"}</td>
                    <td className="h-10 px-3 text-xs">{assistant ? <span className="font-medium">{assistant.realName}</span> : "-"}</td>
                    <td className="h-10 px-3 text-xs text-muted-foreground">{memberList.length} 人</td>
                    <td className="h-10 px-3 last:pr-4">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => { setEditing(r); setFormMode("repo"); }} className="h-7 rounded px-2 text-[11px] hover:bg-accent">编辑</button>
                        <button type="button" onClick={() => setDeleteTarget({ type: "repo", id: r.id, name: r.githubRepo })} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── People library ── */}
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">人员库</h2>
          <button type="button" onClick={() => { setEditing(null); setFormMode("person"); }} className="inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-medium hover:bg-accent"><Plus className="size-3" />新增人员</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground first:pl-4">GitHub ID</th>
                <th className="h-8 px-3 text-[11px] font-medium text-muted-foreground">姓名</th>
                <th className="h-8 w-20 px-3 text-[11px] font-medium text-muted-foreground last:pr-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 ? (
                <tr><td colSpan={3} className="h-24 text-center text-xs text-muted-foreground">暂无人员</td></tr>
              ) : people.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="h-9 px-3 text-xs font-mono first:pl-4">{p.githubId}</td>
                  <td className="h-9 px-3 text-xs">{p.realName}</td>
                  <td className="h-9 px-3 last:pr-4">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditing(p); setFormMode("person"); }} className="h-6 rounded px-1.5 text-[11px] hover:bg-accent">编辑</button>
                      <button type="button" onClick={() => setDeleteTarget({ type: "person", id: p.id, name: p.realName })} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      <Modal open={formMode === "person"} title={`${editing ? "编辑" : "新增"}人员`} onClose={() => setFormMode(null)}>
        <PersonForm initial={editing as Person | undefined} onSave={handleSavePerson} onCancel={() => setFormMode(null)} saving={saving} />
      </Modal>
      <Modal open={formMode === "repo"} title={`${editing ? "编辑" : "添加"}仓库`} onClose={() => setFormMode(null)}>
        <RepoForm initial={editing as RepoDetail | undefined} people={people} onSave={handleSaveRepo} onCancel={() => setFormMode(null)} saving={saving} />
      </Modal>

      <ConfirmDialog open={deleteTarget !== null} title="确认删除" description={`确定要删除「${deleteTarget?.name}」吗？`} confirmLabel="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
