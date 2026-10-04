"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Shield,
  Send,
  Loader2,
  History,
  MessageSquare,
  AlertCircle,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { STATUSES, PRIORITIES, STATUS_LABELS, PRIORITY_LABELS, getValidTransitions } from "@/lib/constants";

export default function WorkItemDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Queries
  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["work-item", id],
    queryFn: () => api.workItem(id),
    enabled: Boolean(id),
  });

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["work-item-comments", id],
    queryFn: () => api.comments(id),
    enabled: Boolean(id),
  });

  const { data: activities, isLoading: loadingActivities } = useQuery({
    queryKey: ["work-item-activity", id],
    queryFn: () => api.activity(id),
    enabled: Boolean(id),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
  });

  // Current team members for assignee dropdown
  const currentTeam = teams?.find((t) => t.id === item?.teamId);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data) => api.updateWorkItem(id, { ...data, version: item.version }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["work-item", id], updated);
      queryClient.invalidateQueries({ queryKey: ["work-item", id] });
      queryClient.invalidateQueries({ queryKey: ["work-item-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      toast.success("Work item updated");
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update work item");
      queryClient.invalidateQueries({ queryKey: ["work-item", id] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId) =>
      api.assignWorkItem(id, {
        assigneeId: assigneeId === "__none" ? null : assigneeId,
        version: item.version,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["work-item", id], updated);
      queryClient.invalidateQueries({ queryKey: ["work-item", id] });
      queryClient.invalidateQueries({ queryKey: ["work-item-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      toast.success("Assignment updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update assignment");
      queryClient.invalidateQueries({ queryKey: ["work-item", id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body) => api.addComment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-item-comments", id] });
      setCommentText("");
      toast.success("Comment added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to post comment");
    },
  });

  function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  }

  function startEditing() {
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setIsEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    updateMutation.mutate({
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading work item...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Work Item Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message || "The requested item does not exist or you don't have access to it."}
          </p>
        </div>
        <Link href="/dashboard/work-items">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Work Items
          </Button>
        </Link>
      </div>
    );
  }

  const validNextStatuses = getValidTransitions(item.status);
  const isOverdue =
    item.dueAt &&
    new Date(item.dueAt) < new Date() &&
    !["RESOLVED", "CLOSED"].includes(item.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/work-items"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Work Items</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
            <Edit2 className="h-3.5 w-3.5" />
            Edit Item
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <Card className="border shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status} dot>
                  {STATUS_LABELS[item.status] || item.status}
                </Badge>
                <Badge variant={item.priority}>
                  {PRIORITY_LABELS[item.priority] || item.priority}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {item.teamName}
                </span>
                {isOverdue && (
                  <Badge variant="critical" className="gap-1">
                    <Clock className="h-3 w-3" /> Overdue
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground break-words">
                {item.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span>
                  Created by <strong className="font-medium text-foreground">{item.creatorName}</strong>
                </span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
                {item.updatedAt && item.updatedAt !== item.createdAt && (
                  <>
                    <span>•</span>
                    <span>
                      Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Layout: Left Content (Description + Comments), Right Sidebar (Details + Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {item.description ? (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No description provided. Click &apos;Edit Item&apos; above to add one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Comments ({comments?.length || 0})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Comments */}
              <div className="space-y-4">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No comments yet. Start the conversation below.
                  </p>
                ) : (
                  comments?.map((comment) => {
                    const initials = comment.userName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={comment.id}
                        className="flex gap-3 p-3.5 rounded-lg bg-slate-50/70 border border-slate-100"
                      >
                        <Avatar className="h-7 w-7 mt-0.5">
                          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {comment.userName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Separator />

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                <Label htmlFor="comment-input" className="text-xs font-medium text-muted-foreground">
                  Leave a comment
                </Label>
                <Textarea
                  id="comment-input"
                  placeholder="Share updates, ask questions, or provide context..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="gap-1.5"
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Post Comment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Properties & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Properties Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                <Select
                  value={item.status}
                  onValueChange={(newStatus) => updateMutation.mutate({ status: newStatus })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              status === "RESOLVED"
                                ? "bg-emerald-500"
                                : status === "IN_PROGRESS"
                                ? "bg-amber-500"
                                : status === "BLOCKED"
                                ? "bg-rose-500"
                                : status === "OPEN"
                                ? "bg-sky-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{STATUS_LABELS[status]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Priority</Label>
                <Select
                  value={item.priority}
                  onValueChange={(newPriority) => updateMutation.mutate({ priority: newPriority })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              priority === "CRITICAL"
                                ? "bg-red-500"
                                : priority === "HIGH"
                                ? "bg-orange-500"
                                : priority === "MEDIUM"
                                ? "bg-blue-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{PRIORITY_LABELS[priority]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-medium">Assignee</Label>
                  {!item.assigneeId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-[11px] h-auto p-0 text-primary hover:underline"
                      onClick={() => assignMutation.mutate(user.id)}
                    >
                      Assign to me
                    </Button>
                  )}
                </div>
                <Select
                  value={item.assigneeId || "__none"}
                  onValueChange={(val) => assignMutation.mutate(val)}
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {currentTeam?.members?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{member.name}</span>
                          {member.id === user?.id && (
                            <span className="text-[10px] text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Additional Metadata */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Team
                  </span>
                  <span className="font-medium text-foreground">{item.teamName}</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Due Date
                  </span>
                  <span className={`font-medium ${isOverdue ? "text-rose-600 font-semibold" : "text-foreground"}`}>
                    {item.dueAt ? format(new Date(item.dueAt), "MMM d, yyyy") : "No due date"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Version
                  </span>
                  <span className="font-mono text-[11px] text-foreground">v{item.version}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity / Audit Trail Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : activities?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No activity logged yet.
                </p>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {activities?.map((act) => (
                    <div key={act.id} className="relative pl-6 text-xs space-y-0.5">
                      <div className="absolute left-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                      <div className="text-foreground/90">
                        <strong className="font-medium">{act.actorName}</strong>{" "}
                        <span className="text-muted-foreground">
                          {act.action === "ASSIGNED"
                            ? `assigned to ${act.newValue}`
                            : act.action === "UNASSIGNED"
                            ? "unassigned item"
                            : act.action === "STATUS_CHANGED"
                            ? `changed status from ${act.oldValue} to ${act.newValue}`
                            : act.action === "PRIORITY_CHANGED"
                            ? `changed priority from ${act.oldValue} to ${act.newValue}`
                            : act.action.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Title / Description Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Work Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Work item title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Detailed description..."
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
