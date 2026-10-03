"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, Clock, Plus, Target, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

const PRESET_SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];

export default function SyllabusCoveragePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [selectedSubject, setSelectedSubject] = useState("Physics");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states for adding topic
  const [topicName, setTopicName] = useState("");
  const [chapter, setChapter] = useState("");
  const [targetWeekOrDate, setTargetWeekOrDate] = useState("");
  const [plannedOrder, setPlannedOrder] = useState("1");

  // Fetch syllabus items for selected subject
  const { data, isLoading } = useQuery({
    queryKey: ["syllabus-plan", selectedSubject],
    queryFn: async () => {
      const res = await apiClient<any>(`/api/syllabus-plan?subject=${encodeURIComponent(selectedSubject)}`);
      return res;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient<any>("/api/syllabus-plan", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Topic added to syllabus roadmap");
      setIsAddOpen(false);
      setTopicName("");
      setChapter("");
      setTargetWeekOrDate("");
      queryClient.invalidateQueries({ queryKey: ["syllabus-plan", selectedSubject] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add topic"),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) {
      toast.error("Topic name is required");
      return;
    }

    addItemMutation.mutate({
      subject: selectedSubject,
      topicName,
      chapter,
      targetWeekOrDate,
      plannedOrder: Number(plannedOrder) || 1,
    });
  };

  const items = data?.items || [];
  const stats = data?.stats || { total: 0, covered: 0, pending: 0, progressPercent: 0 };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Syllabus & Topic Coverage</h1>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-semibold px-2.5 py-0.5">
                Live Class Register Feed
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Live tracking of topics taught during 1:1 sessions vs. scheduled course curriculum.
            </p>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl flex items-center gap-2 h-10 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Planned Topic
          </Button>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PRESET_SUBJECTS.map((sub) => (
            <Button
              key={sub}
              variant={selectedSubject === sub ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(sub)}
              className={
                selectedSubject === sub
                  ? "bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                  : "bg-white text-gray-700 hover:bg-gray-50 rounded-xl"
              }
            >
              {sub}
            </Button>
          ))}
        </div>

        {/* Progress Overview Card */}
        <Card className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-md border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-100 block">Overall Coverage</span>
              <h3 className="text-3xl font-black mt-1">{stats.progressPercent}% Completed</h3>
              <p className="text-xs text-orange-100 mt-1">
                {stats.covered} of {stats.total} topics covered across confirmed 1:1 sessions
              </p>
            </div>

            <div className="w-full sm:w-64 bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Progress value={stats.progressPercent} className="h-3 bg-black/20" />
            </div>
          </div>
        </Card>

        {/* Roadmap Topics List */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            Curriculum Sequence for {selectedSubject}
          </h3>

          {isLoading ? (
            <div className="py-20 text-center text-gray-400 animate-pulse">Loading roadmap...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No syllabus items added for {selectedSubject} yet. Click "Add Planned Topic" to define the term roadmap.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item: any, idx: number) => (
                <div key={item._id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.plannedOrder || idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{item.topicName}</h4>
                      {item.chapter && <span className="text-xs text-gray-400">Chapter: {item.chapter}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.targetWeekOrDate && (
                      <span className="text-xs text-gray-400 hidden sm:inline">Target: {item.targetWeekOrDate}</span>
                    )}
                    {item.isCovered ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2 py-0.5 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Covered
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs font-bold px-2 py-0.5">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Modal: Add Topic */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Add Planned Topic</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Add an item to the syllabus roadmap for {selectedSubject}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Topic Name *</Label>
                <Input
                  placeholder="e.g. Thermodynamics: Carnot Cycle & Entropy"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Chapter / Unit</Label>
                  <Input
                    placeholder="e.g. Unit 3"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Planned Sequence (#)</Label>
                  <Input
                    type="number"
                    value={plannedOrder}
                    onChange={(e) => setPlannedOrder(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Target Date / Week</Label>
                <Input
                  placeholder="e.g. Week 2 - Oct or Oct 15"
                  value={targetWeekOrDate}
                  onChange={(e) => setTargetWeekOrDate(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  Save Topic
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
