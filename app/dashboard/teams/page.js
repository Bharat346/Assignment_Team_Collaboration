"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Search,
  ListTodo,
  Shield,
  Loader2,
  Mail,
  UserCheck,
  Calendar,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function TeamsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
  });

  const filteredTeams = teams?.filter((team) => {
    const query = search.toLowerCase();
    const matchesTeam = team.name.toLowerCase().includes(query);
    const matchesMember = team.members?.some(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
    return matchesTeam || matchesMember;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your teams, view active members, and track assigned work.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams or members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading teams...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-12 text-center text-destructive">
            <p className="font-medium">Failed to load teams: {error.message}</p>
          </CardContent>
        </Card>
      ) : filteredTeams?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-white">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No teams found</p>
          <p className="text-sm mt-1">
            {search ? "No team or member matches your search" : "No teams configured yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card
              key={team.id}
              className="flex flex-col hover:shadow-md transition-shadow border-slate-200/80"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {team.name[0]?.toUpperCase()}
                      </div>
                      {team.name}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {team.memberCount || team.members?.length || 0} member
                      {(team.memberCount || team.members?.length) !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>

                  <Link href={`/dashboard/work-items?teamId=${team.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      Work Items
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                <Separator />

                {/* Member List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Members
                  </div>

                  <div className="space-y-2">
                    {team.members?.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No members assigned.</p>
                    ) : (
                      team.members?.map((member) => {
                        const initials = member.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-[10px] bg-slate-100 text-slate-700 font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                                  {member.name}
                                  {member.id === user?.id && (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5 shrink-0" />
                                  {member.email}
                                </div>
                              </div>
                            </div>

                            <Badge variant={member.role} className="text-[10px] px-2 py-0 shrink-0">
                              {member.role === "ADMIN" && <Shield className="h-2.5 w-2.5 mr-1" />}
                              {member.role}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
                  </span>

                  <Link
                    href={`/dashboard/work-items?teamId=${team.id}`}
                    className="text-primary hover:underline flex items-center gap-0.5 text-xs font-medium"
                  >
                    View team board
                    <ExternalLink className="h-3 w-3 ml-0.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
