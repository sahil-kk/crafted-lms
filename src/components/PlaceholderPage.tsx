import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppRole } from "@/hooks/useAuth";

interface Props {
  role: AppRole;
  title: string;
  description?: string;
}

export const PlaceholderPage = ({ role, title, description }: Props) => (
  <DashboardLayout role={role} title={title}>
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
    </div>
    <Card className="p-12 text-center shadow-card border-border/60">
      <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
        <Construction className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display font-semibold text-lg">Coming soon</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        This section is wired to the backend and ready to be built out in the next iteration.
      </p>
    </Card>
  </DashboardLayout>
);
