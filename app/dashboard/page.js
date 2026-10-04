"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListTodo,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  Loader2,
  Ban,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DashboardCharts } from "@/components/dashboard-charts";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";

function StatCard({ title, value, icon: Icon, variant = "default", href }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              variant === "critical"
                ? "bg-red-100 text-red-600"
                : variant === "warning"
                ? "bg-orange-100 text-orange-600"
                : variant === "info"
                ? "bg-blue-100 text-blue-600"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function WorkItemRow({ item }) {
  return (
    <Link href={`/dashboard/work-items/${item.id}`}>
      <div className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={item.status} dot className="text-[10px]">
              {STATUS_LABELS[item.status] || item.status}
            </Badge>
            <Badge variant={item.priority} className="text-[10px]">
              {PRIORITY_LABELS[item.priority] || item.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.teamName}</span>
          </div>
        </div>
        {item.assigneeName ? (
          <span className="text-xs text-muted-foreground shrink-0">{item.assigneeName}</span>
        ) : (
          <span className="text-xs text-orange-500 shrink-0">Unassigned</span>
        )}
        {item.dueAt && new Date(item.dueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(item.status) && (
          <Clock className="h-3.5 w-3.5 text-red-500 shrink-0" />
        )}
      </div>
    </Link>
  );
}

function WorkItemSection({ title, items, isLoading, emptyMessage, href }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {href && (
          <Link href={href}>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y">
            {items?.slice(0, 5).map((item) => (
              <WorkItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: myWork, isLoading: loadingMyWork } = useQuery({
    queryKey: ["work-items", "my"],
    queryFn: () => api.workItems({ view: "my", limit: 5, sortBy: "updatedAt", sortOrder: "desc" }),
  });

  const { data: critical, isLoading: loadingCritical } = useQuery({
    queryKey: ["work-items", "critical"],
    queryFn: () => api.workItems({ view: "critical", limit: 5, sortBy: "priority", sortOrder: "asc" }),
  });

  const { data: blocked, isLoading: loadingBlocked } = useQuery({
    queryKey: ["work-items", "blocked"],
    queryFn: () => api.workItems({ view: "blocked", limit: 5 }),
  });

  const { data: unassigned, isLoading: loadingUnassigned } = useQuery({
    queryKey: ["work-items", "unassigned"],
    queryFn: () => api.workItems({ view: "unassigned", limit: 5 }),
  });

  const { data: overdue, isLoading: loadingOverdue } = useQuery({
    queryKey: ["work-items", "overdue"],
    queryFn: () => api.workItems({ view: "overdue", limit: 5 }),
  });

  const { data: allItems } = useQuery({
    queryKey: ["work-items", "overview"],
    queryFn: () => api.workItems({ limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Work Items"
          value={myWork?.total ?? "—"}
          icon={UserCheck}
          href="/dashboard/work-items?view=my"
        />
        <StatCard
          title="Critical / High"
          value={critical?.total ?? "—"}
          icon={AlertTriangle}
          variant="critical"
          href="/dashboard/work-items?view=critical"
        />
        <StatCard
          title="Blocked"
          value={blocked?.total ?? "—"}
          icon={Ban}
          variant="warning"
          href="/dashboard/work-items?view=blocked"
        />
        <StatCard
          title="Overdue"
          value={overdue?.total ?? "—"}
          icon={Clock}
          variant="info"
          href="/dashboard/work-items?view=overdue"
        />
      </div>

      {/* Visual Analytics Charts */}
      <DashboardCharts workItems={allItems?.items || []} />

      {/* Work Item Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkItemSection
          title="My Work"
          items={myWork?.items}
          isLoading={loadingMyWork}
          emptyMessage="No work items assigned to you"
          href="/dashboard/work-items?view=my"
        />
        <WorkItemSection
          title="Critical & High Priority"
          items={critical?.items}
          isLoading={loadingCritical}
          emptyMessage="No critical or high priority items"
          href="/dashboard/work-items?view=critical"
        />
        <WorkItemSection
          title="Unassigned Work"
          items={unassigned?.items}
          isLoading={loadingUnassigned}
          emptyMessage="All work items are assigned"
          href="/dashboard/work-items?view=unassigned"
        />
        <WorkItemSection
          title="Overdue Items"
          items={overdue?.items}
          isLoading={loadingOverdue}
          emptyMessage="No overdue items — great job!"
          href="/dashboard/work-items?view=overdue"
        />
      </div>
    </div>
  );
}
