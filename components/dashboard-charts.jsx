"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, CheckCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";

export function DashboardCharts({ workItems = [] }) {
  const total = workItems.length;

  // Status aggregation
  const statusCounts = {
    OPEN: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };

  // Priority aggregation
  const priorityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  workItems.forEach((item) => {
    if (statusCounts[item.status] !== undefined) {
      statusCounts[item.status]++;
    }
    if (priorityCounts[item.priority] !== undefined) {
      priorityCounts[item.priority]++;
    }
  });

  const resolvedOrClosed = statusCounts.RESOLVED + statusCounts.CLOSED;
  const resolutionRate = total > 0 ? Math.round((resolvedOrClosed / total) * 100) : 0;

  // Donut chart calculations
  const priorityColors = {
    CRITICAL: "#ef4444", // red-500
    HIGH: "#f97316",     // orange-500
    MEDIUM: "#3b82f6",   // blue-500
    LOW: "#94a3b8",      // slate-400
  };

  const statusColors = {
    OPEN: { bar: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
    IN_PROGRESS: { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    BLOCKED: { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
    RESOLVED: { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    CLOSED: { bar: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const priorityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const donutSlices = priorityOrder.map((key) => {
    const count = priorityCounts[key];
    const percentage = total > 0 ? count / total : 0;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += percentage;

    return {
      key,
      label: PRIORITY_LABELS[key] || key,
      count,
      percentage: Math.round(percentage * 100),
      color: priorityColors[key],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Status Distribution Bar Chart */}
      <Card className="border shadow-xs hover:shadow-sm transition-shadow">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Work Items by Status
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of all {total} tracked operational tasks
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {resolutionRate}% Resolved
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {Object.entries(statusCounts).map(([status, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const style = statusColors[status];

            return (
              <Link
                key={status}
                href={`/dashboard/work-items?status=${status}`}
                className="group block space-y-1.5 p-1 rounded-md hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.bar}`} />
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {STATUS_LABELS[status] || status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">{count}</span>
                    <span className="w-10 text-right text-[11px]">({pct}%)</span>
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${style.bar}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Chart 2: Priority Breakdown Donut Chart */}
      <Card className="border shadow-xs hover:shadow-sm transition-shadow">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Priority Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Risk allocation and severity weighting
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground font-medium">
              {(priorityCounts.CRITICAL || 0) + (priorityCounts.HIGH || 0)} Urgent
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#f1f5f9"
                  strokeWidth="22"
                  fill="transparent"
                />

                {/* Data Slices */}
                {total > 0 &&
                  donutSlices.map((slice) =>
                    slice.count > 0 ? (
                      <circle
                        key={slice.key}
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={slice.color}
                        strokeWidth="22"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-500 ease-out hover:opacity-85"
                      />
                    ) : null
                  )}
              </svg>

              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {total}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  Work Items
                </span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-3 flex-1 w-full sm:w-auto">
              {donutSlices.map((slice) => (
                <Link
                  key={slice.key}
                  href={`/dashboard/work-items?priority=${slice.key}`}
                  className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      {slice.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {slice.count}
                    </span>
                    <Badge variant={slice.key} className="text-[10px] px-1.5 py-0">
                      {slice.percentage}%
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
