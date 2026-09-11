"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAppData } from "@/hooks/useAppData";

const StudentNews = () => {
  const { announcements } = useAppData();
  const items = [...announcements].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <DashboardLayout role="student">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">News & Announcements</h2>
        <p className="text-muted-foreground mt-1">Updates from your teachers and admin</p>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg">No announcements yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for updates from your teachers.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id} className="p-6 shadow-card hover:shadow-elevated transition-smooth border-border/60">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold">{a.title}</h3>
                    {a.is_global && <Badge variant="secondary" className="bg-primary-soft text-primary border-0 text-xs">Global</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentNews;
