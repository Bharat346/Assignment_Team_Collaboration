"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Clock,
  Inbox,
  ArrowUpDown,
  X,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { STATUSES, PRIORITIES, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";

function CreateWorkItemDialog({ teams, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    teamId: "",
    assigneeId: "",
    dueAt: "",
  });

  const selectedTeam = useMemo(
    () => teams?.find((t) => t.id === form.teamId),
    [teams, form.teamId]
  );

  const createMutation = useMutation({
    mutationFn: (data) => api.createWorkItem(data, uuidv4()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      toast.success("Work item created successfully");
      onOpenChange(false);
      setForm({ title: "", description: "", priority: "MEDIUM", teamId: "", assigneeId: "", dueAt: "" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create work item");
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      ...form,
      assigneeId: form.assigneeId || undefined,
      dueAt: form.dueAt || undefined,
    };
    createMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Work Item</DialogTitle>
          <DialogDescription>
            Add a new work item to track operational work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief description of the work item"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed description of what needs to be done"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select
                value={form.teamId}
                onValueChange={(val) => setForm({ ...form, teamId: val, assigneeId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(val) => setForm({ ...form, priority: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={form.assigneeId}
                onValueChange={(val) => setForm({ ...form, assigneeId: val })}
                disabled={!form.teamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {selectedTeam?.members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkItemsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const filters = {
    page: parseInt(searchParams.get("page") || "1"),
    limit: 20,
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    teamId: searchParams.get("teamId") || "",
    assigneeId: searchParams.get("assigneeId") || "",
    search: searchParams.get("search") || "",
    view: searchParams.get("view") || "",
    sortBy: searchParams.get("sortBy") || "updatedAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
  };

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-items", filters],
    queryFn: () => api.workItems(filters),
    placeholderData: (prev) => prev,
  });

  function updateFilters(newFilters) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...newFilters, page: newFilters.page || 1 };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== "" && k !== "limit") params.set(k, v);
    });
    router.push(`/dashboard/work-items?${params.toString()}`);
  }

  function handleSearch(e) {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }

  const hasActiveFilters = filters.status || filters.priority || filters.teamId || filters.view || filters.search;

  // Gather all members across teams for the assignee filter
  const allMembers = useMemo(() => {
    if (!teamsData) return [];
    const membersMap = new Map();
    teamsData.forEach((team) => {
      team.members?.forEach((m) => {
        if (!membersMap.has(m.id)) membersMap.set(m.id, m);
      });
    });
    return Array.from(membersMap.values());
  }, [teamsData]);

  const viewLabels = {
    my: "My Work",
    unassigned: "Unassigned",
    critical: "Critical & High Priority",
    blocked: "Blocked",
    overdue: "Overdue",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {filters.view ? viewLabels[filters.view] || "Work Items" : "Work Items"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.total} item${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search work items..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" size="default">
                Search
              </Button>
            </form>

            <Select
              value={filters.status || "all"}
              onValueChange={(val) => updateFilters({ status: val === "all" ? "" : val })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority || "all"}
              onValueChange={(val) => updateFilters({ priority: val === "all" ? "" : val })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.teamId || "all"}
              onValueChange={(val) => updateFilters({ teamId: val === "all" ? "" : val })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamsData?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => {
                  setSearchInput("");
                  router.push("/dashboard/work-items");
                }}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Items Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-destructive">
          <p>Error loading work items: {error.message}</p>
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No work items found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Create your first work item to get started"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.items?.map((item) => (
              <Link key={item.id} href={`/dashboard/work-items/${item.id}`} className="block group">
                <Card className="shadow-none hover:shadow-none border border-slate-200/90 hover:border-primary/50 transition-colors duration-150 cursor-pointer rounded-xl bg-white">
                  <CardContent className="p-5 sm:px-6 sm:py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
                          <Badge variant={item.status} dot>
                            {STATUS_LABELS[item.status] || item.status}
                          </Badge>
                          <Badge variant={item.priority}>
                            {PRIORITY_LABELS[item.priority] || item.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md">
                            {item.teamName}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {item.assigneeName || "Unassigned"}
                          </span>
                          {item.dueAt && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className={`text-xs flex items-center gap-1 ${
                                new Date(item.dueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(item.status)
                                  ? 'text-red-500 font-medium'
                                  : 'text-muted-foreground'
                              }`}>
                                <Clock className="h-3 w-3" />
                                {new Date(item.dueAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right-side button with right arrow on hover */}
                      <div className="shrink-0 flex items-center pl-2">
                        <div className="h-9 w-9 rounded-full border border-slate-200 bg-slate-50/80 text-slate-400 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:scale-105 flex items-center justify-center transition-all duration-200">
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => updateFilters({ page: data.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => updateFilters({ page: data.page + 1 })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <CreateWorkItemDialog
        teams={teamsData}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
