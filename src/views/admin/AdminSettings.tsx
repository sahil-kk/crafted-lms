"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AdminSettings = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirmPassword) return toast.error("Passwords don't match");
    toast.success("UI-only mode: connect this form to your backend password endpoint");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <DashboardLayout role="admin">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Your admin account</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Card className="p-6 shadow-card border-border/60">
          <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center mb-3">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold">Account</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium truncate">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">Admin</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6 shadow-card border-border/60">
          <h3 className="font-display font-semibold">Change password</h3>
          <form onSubmit={onUpdate} className="space-y-3 mt-4">
            <div>
              <Label>New password</Label>
              <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input type="password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="hero">Update</Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
