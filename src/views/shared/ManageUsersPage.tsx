"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, Copy, Pencil, Phone, BookOpen, GraduationCap, School, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { format } from "date-fns";

interface Props {
  role: "student" | "teacher" | "parent";
  viewerRole: AppRole;
  title: string;
  description: string;
}

const randomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < 10; i += 1) output += chars[Math.floor(Math.random() * chars.length)];
  return `${output}!`;
};

const getAutofilledPassword = (fullName: string, course: string) => {
  const prefixMap: Record<string, string> = {
    "8th": "C8",
    "9th": "C9",
    "10th": "C10",
    "11th": "C11",
    "12th": "C12"
  };
  const prefix = prefixMap[course] || "C10";
  const rawFirstName = fullName.trim().split(" ")[0] || "Student";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  return `${firstName}@${prefix}`;
};

const formatStudentId = (user: any) => {
  if (user.studentId) return user.studentId;
  const rawId = user.id || "";
  if (/^C\d+/.test(rawId)) return rawId;
  const classNum = user.course?.replace("th", "") || "10";
  return `C${classNum}XX`;
};

export const ManageUsersPage = ({ role, viewerRole, title, description }: Props) => {
  const { users, createUser, deleteUser, updateUser, isLoading } = useAppData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  const [form, setForm] = useState({ 
    email: "", 
    full_name: "", 
    password: role === "student" ? getAutofilledPassword("", "10th") : randomPassword(),
    course: "10th", 
    batch: "Batch 1", 
    phone: "", 
    subject: "Physics",
    linkedStudentId: "",
    relationship: "Parent",
    assignedCourses: ["Physics", "Chemistry", "Biology", "Mathematics"],
    classLink: ""
  });
  
  const [editForm, setEditForm] = useState({ 
    id: "", 
    email: "", 
    full_name: "", 
    password: "", 
    course: "10th", 
    batch: "Batch 1",
    phone: "",
    subject: "Physics",
    linkedStudentId: "",
    relationship: "Parent",
    assignedCourses: [] as string[],
    classLink: ""
  });

  const students = users.filter((user) => user.role === "student");

  const rows = useMemo(() => {
    return users
      .filter((user) => user.role === role)
      .filter((user) => {
        if (role === "student") {
          if (selectedClass !== "all") {
            return user.course === selectedClass;
          }
        } else if (role === "teacher") {
          if (selectedSubject !== "all") {
            const sub = user.subject?.toLowerCase() || "";
            if (selectedSubject === "phy") return sub.includes("phy");
            if (selectedSubject === "che") return sub.includes("che");
            if (selectedSubject === "mat") return sub.includes("math") || sub.includes("mat");
            if (selectedSubject === "bio") return sub.includes("bio");
            return sub === selectedSubject.toLowerCase();
          }
        }
        return true;
      })
      .filter((user) => 
        [user.email, user.full_name, user.phone, user.course, user.batch, user.subject]
          .some((val) => val?.toLowerCase().includes(query.toLowerCase()))
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [query, role, users, selectedClass, selectedSubject]);

  if (isLoading && users.length === 0) {
    return (
      <DashboardLayout role={viewerRole} title={title}>
        <Card className="p-6 border-border/40">
          <div className="flex h-[400px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">Loading {role}s list...</p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createUser({ 
        email: form.email, 
        full_name: form.full_name, 
        role,
        password: form.password,
        course: role === "student" ? form.course : undefined,
        batch: role === "student" ? form.batch : undefined,
        phone: form.phone,
        subject: role === "teacher" ? form.subject : undefined,
        linkedStudentId: role === "parent" ? form.linkedStudentId : undefined,
        relationship: role === "parent" ? form.relationship : undefined,
        assignedCourses: role === "student" ? form.assignedCourses : undefined,
        classLink: role === "student" ? form.classLink : undefined,
      });
      const generatedId = role === "student" ? (res?.student?.studentId || res?.studentId) : null;
      toast.success(`${role} created`, {
        description: generatedId 
          ? `ID: ${generatedId} / Password: ${form.password}`
          : `${form.email} / ${form.password}`,
        duration: 10000,
      });
      setOpen(false);
      setForm({ 
        email: "", 
        full_name: "", 
        password: role === "student" ? getAutofilledPassword("", "10th") : randomPassword(), 
        course: "10th", 
        batch: "Batch 1", 
        phone: "", 
        subject: "Physics",
        linkedStudentId: "",
        relationship: "Parent",
        assignedCourses: ["Physics", "Chemistry", "Biology", "Mathematics"],
        classLink: ""
      });
    } catch (err: any) {
      toast.error(`Failed to create ${role}`, {
        description: err.message || "Please check the backend deployment and try again.",
      });
    }
  };

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({ 
        id: editForm.id, 
        email: editForm.email, 
        full_name: editForm.full_name, 
        role,
        course: role === "student" ? editForm.course : undefined,
        batch: role === "student" ? editForm.batch : undefined,
        phone: editForm.phone,
        subject: role === "teacher" ? editForm.subject : undefined,
        linkedStudentId: role === "parent" ? editForm.linkedStudentId : undefined,
        relationship: role === "parent" ? editForm.relationship : undefined,
        assignedCourses: role === "student" ? editForm.assignedCourses : undefined,
        classLink: role === "student" ? editForm.classLink : undefined,
        ...(editForm.password ? { password: editForm.password } : {})
      });
      toast.success(`${role} updated`);
      setEditOpen(false);
    } catch (err: any) {
      toast.error(`Failed to update ${role}`, {
        description: err.message || "Please try again.",
      });
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditForm({ 
      id: user.id, 
      email: user.email, 
      full_name: user.full_name, 
      password: "",
      course: user.course || "10th",
      batch: user.batch || "Batch 1",
      phone: user.phone || "",
      subject: user.subject || "Physics",
      linkedStudentId: user.linkedStudentId || "",
      relationship: user.relationship || "Parent",
      assignedCourses: user.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"],
      classLink: user.classLink || ""
    });
    setEditOpen(true);
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteUser(id, role);
      toast.success("Deleted");
    } catch (err: any) {
      toast.error("Delete failed", {
        description: err.message || "Please try again.",
      });
    }
  };

  // Helper to determine row coloring class for students based on grade
  const getStudentRowClass = (classGrade?: string) => {
    switch (classGrade) {
      case "8th":
        return "bg-emerald-50/40 border-l-4 border-l-emerald-500 hover:bg-emerald-100/40 transition-all";
      case "9th":
        return "bg-blue-50/40 border-l-4 border-l-blue-500 hover:bg-blue-100/40 transition-all";
      case "10th":
        return "bg-purple-50/40 border-l-4 border-l-purple-500 hover:bg-purple-100/40 transition-all";
      case "11th":
        return "bg-amber-50/40 border-l-4 border-l-amber-500 hover:bg-amber-100/40 transition-all";
      case "12th":
        return "bg-rose-50/40 border-l-4 border-l-rose-500 hover:bg-rose-100/40 transition-all";
      default:
        return "border-l-4 border-l-transparent hover:bg-muted/50 transition-all";
    }
  };

  return (
    <DashboardLayout role={viewerRole} title={title}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {viewerRole === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="h-4 w-4 mr-2" />Add {role}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={onCreate}>
                <DialogHeader>
                  <DialogTitle>Create {role}</DialogTitle>
                  <DialogDescription>
                    Fill in details to provision a new {role} account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Full name</Label>
                    <Input 
                      required 
                      value={form.full_name} 
                      onChange={(e) => {
                        const nameVal = e.target.value;
                        setForm((prev) => {
                          const updated = { ...prev, full_name: nameVal };
                          if (role === "student") {
                            updated.password = getAutofilledPassword(nameVal, prev.course);
                          }
                          return updated;
                        });
                      }} 
                      placeholder="e.g. John Doe" 
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@school.com" />
                    {role === "student" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Note: Student ID will be generated automatically (e.g. C1001) based on the class.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Phone number</Label>
                    <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 9876543210" />
                  </div>

                  {role === "student" && (
                    <div className="space-y-4">
                      <div>
                        <Label>Class / Grade</Label>
                        <Select 
                          value={form.course} 
                          onValueChange={(val) => {
                            setForm((prev) => {
                              const updated = { ...prev, course: val };
                              if (role === "student") {
                                updated.password = getAutofilledPassword(prev.full_name, val);
                              }
                              return updated;
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8th">8th Grade</SelectItem>
                            <SelectItem value="9th">9th Grade</SelectItem>
                            <SelectItem value="10th">10th Grade</SelectItem>
                            <SelectItem value="11th">11th Grade</SelectItem>
                            <SelectItem value="12th">12th Grade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Assigned Courses</Label>
                        <div className="grid grid-cols-2 gap-3 p-3 border border-border rounded-xl bg-secondary/20">
                          {["Physics", "Chemistry", "Biology", "Mathematics"].map((subj) => {
                            const isChecked = form.assignedCourses.includes(subj);
                            return (
                              <label key={subj} className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                                <Checkbox 
                                  checked={isChecked} 
                                  onCheckedChange={(checked) => {
                                    setForm((prev) => {
                                      const nextCourses = checked 
                                        ? [...prev.assignedCourses, subj]
                                        : prev.assignedCourses.filter((x) => x !== subj);
                                      return { ...prev, assignedCourses: nextCourses };
                                    });
                                  }}
                                />
                                {subj}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Live Class Link</Label>
                        <Input 
                          type="url"
                          placeholder="https://meet.google.com/..." 
                          value={form.classLink || ""} 
                          onChange={(e) => setForm({ ...form, classLink: e.target.value })} 
                        />
                      </div>
                    </div>
                  )}

                  {role === "teacher" && (
                    <div>
                      <Label>Subject specialization</Label>
                      <Select value={form.subject} onValueChange={(val) => setForm({ ...form, subject: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Biology">Biology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {role === "parent" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Linked student</Label>
                        <Select value={form.linkedStudentId} onValueChange={(val) => setForm({ ...form, linkedStudentId: val })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name || student.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Relationship</Label>
                        <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Initial password</Label>
                    <div className="flex gap-2">
                      <Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <Button type="button" variant="outline" size="icon" onClick={() => {
                        navigator.clipboard.writeText(form.password);
                        toast.success("Copied to clipboard");
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" variant="hero" disabled={role === "parent" && !form.linkedStudentId}>Create {role}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onEdit}>
            <DialogHeader>
              <DialogTitle>Edit {role}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Full name</Label>
                <Input required value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone number</Label>
                <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>

              {role === "student" && (
                <div className="space-y-4">
                  <div>
                    <Label>Class / Grade</Label>
                    <Select value={editForm.course} onValueChange={(val) => setEditForm({ ...editForm, course: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8th">8th Grade</SelectItem>
                        <SelectItem value="9th">9th Grade</SelectItem>
                        <SelectItem value="10th">10th Grade</SelectItem>
                        <SelectItem value="11th">11th Grade</SelectItem>
                        <SelectItem value="12th">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Courses</Label>
                    <div className="grid grid-cols-2 gap-3 p-3 border border-border rounded-xl bg-secondary/20">
                      {["Physics", "Chemistry", "Biology", "Mathematics"].map((subj) => {
                        const isChecked = editForm.assignedCourses.includes(subj);
                        return (
                          <label key={subj} className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                            <Checkbox 
                              checked={isChecked} 
                              onCheckedChange={(checked) => {
                                  setEditForm((prev) => {
                                    const nextCourses = checked 
                                      ? [...prev.assignedCourses, subj]
                                      : prev.assignedCourses.filter((x) => x !== subj);
                                    return { ...prev, assignedCourses: nextCourses };
                                  });
                              }}
                            />
                            {subj}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Live Class Link</Label>
                    <Input 
                      type="url"
                      placeholder="https://meet.google.com/..." 
                      value={editForm.classLink || ""} 
                      onChange={(e) => setEditForm({ ...editForm, classLink: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              {role === "teacher" && (
                <div>
                  <Label>Subject specialization</Label>
                  <Select value={editForm.subject} onValueChange={(val) => setEditForm({ ...editForm, subject: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {role === "parent" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Linked student</Label>
                    <Select value={editForm.linkedStudentId} onValueChange={(val) => setEditForm({ ...editForm, linkedStudentId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name || student.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input value={editForm.relationship} onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })} />
                  </div>
                </div>
              )}

              <div>
                <Label>New Password (leave blank to keep current)</Label>
                <Input type="text" minLength={6} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="New password" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero" disabled={role === "parent" && !editForm.linkedStudentId}>Update {role}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="p-6 shadow-card border-border/60">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <Input placeholder="Search name or email..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          
          <div className="flex items-center gap-2">
            {role === "student" && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Filter by Class:</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="8th">8th Grade</SelectItem>
                    <SelectItem value="9th">9th Grade</SelectItem>
                    <SelectItem value="10th">10th Grade</SelectItem>
                    <SelectItem value="11th">11th Grade</SelectItem>
                    <SelectItem value="12th">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "teacher" && (
              <div className="flex items-center gap-2 min-w-[220px]">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Filter by Subject:</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="phy">Physics (phy)</SelectItem>
                    <SelectItem value="che">Chemistry (che)</SelectItem>
                    <SelectItem value="mat">Mathematics (mat)</SelectItem>
                    <SelectItem value="bio">Biology (bio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No matching {role}s found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  {role !== "student" && (
                    <>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                    </>
                  )}
                  {role === "student" && (
                    <>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Courses</TableHead>
                    </>
                  )}
                  {role === "teacher" && <TableHead>Subject</TableHead>}
                  {role === "parent" && <TableHead>Linked Student</TableHead>}
                  {role !== "student" && <TableHead>Joined</TableHead>}
                  {viewerRole === "admin" && role !== "student" && <TableHead className="w-24 text-right pr-4">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const studentRowStyle = role === "student" ? getStudentRowClass(row.course) : "hover:bg-muted/50 transition-all";
                  const clickHandler = () => {
                    if (role === "student") {
                      setSelectedStudent(row);
                    }
                  };
                  return (
                    <TableRow 
                      key={row.id} 
                      className={`${studentRowStyle} ${role === "student" ? "cursor-pointer" : ""}`}
                      onClick={clickHandler}
                    >
                      <TableCell className="font-semibold pl-4">
                        <div className="flex items-center gap-2.5">
                          {row.profilePhoto ? (
                            <img
                              src={row.profilePhoto}
                              alt={row.full_name}
                              className="h-8 w-8 rounded-full object-cover shrink-0 border border-border"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {(row.full_name || "?").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-foreground">{row.full_name || "-"}</span>
                        </div>
                      </TableCell>
                      {role !== "student" && (
                        <>
                          <TableCell className="text-muted-foreground text-sm">{row.email}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5 text-foreground/80">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{row.phone || "No phone"}</span>
                            </div>
                          </TableCell>
                        </>
                      )}
                      {role === "student" && (
                        <>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-[#f97316]">{formatStudentId(row)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{row.course || "8th"}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5 text-foreground/80">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{row.phone || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(row.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"]).map((c: string) => (
                                <span key={c} className="inline-flex items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </>
                      )}
                      {role === "teacher" && (
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                            <GraduationCap className="h-3 w-3" />
                            {row.subject || "Physics"}
                          </span>
                        </TableCell>
                      )}
                      {role === "parent" && (
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                            <School className="h-3 w-3" />
                            {students.find((student) => student.id === row.linkedStudentId)?.full_name || row.linkedStudentId || "Not linked"}
                          </span>
                        </TableCell>
                      )}
                      {role !== "student" && (
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(row.created_at), "MMM d, yyyy")}
                        </TableCell>
                      )}
                      {viewerRole === "admin" && role !== "student" && (
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row)} className="hover:bg-primary-soft hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(row.id, row.full_name || row.email)} className="hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Student Details Popup Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-bold">
              <span>Student Details</span>
              <span className="inline-flex items-center rounded-full bg-orange-550/10 px-2.5 py-0.5 text-xs font-semibold text-[#f97316]">
                {selectedStudent?.studentId || selectedStudent?.id}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedStudent.full_name}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class / Grade</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedStudent.course || "8th"} Grade</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</span>
                  <p className="text-foreground text-sm mt-0.5 break-all">{selectedStudent.email}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</span>
                  <p className="text-foreground text-sm mt-0.5">{selectedStudent.phone || "No phone linked"}</p>
                </div>
              </div>

              <div className="border-b border-border/40 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned Courses</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedStudent.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"]).map((c: string) => (
                    <span key={c} className="inline-flex items-center rounded bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {selectedStudent.classLink && (
                <div className="border-b border-border/40 pb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Live Class Link</span>
                  <a 
                    href={selectedStudent.classLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary font-medium hover:underline break-all inline-flex items-center gap-1.5"
                  >
                    {selectedStudent.classLink}
                  </a>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled On</span>
                <p className="text-foreground text-sm mt-0.5">
                  {format(new Date(selectedStudent.created_at), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-2 border-t border-border/40 pt-4">
            {viewerRole === "admin" && (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="gap-1.5"
                  onClick={() => {
                    const studentCopy = { ...selectedStudent };
                    setSelectedStudent(null);
                    handleOpenEdit(studentCopy);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit Student
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="gap-1.5"
                  onClick={() => {
                    const studentId = selectedStudent.id;
                    const studentName = selectedStudent.full_name;
                    setSelectedStudent(null);
                    onDelete(studentId, studentName);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete Student
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" onClick={() => setSelectedStudent(null)} className="ml-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
