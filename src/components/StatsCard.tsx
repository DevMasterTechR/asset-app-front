import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

export const StatsCard = ({ title, value, icon: Icon, description, variant = "default", onClick }: StatsCardProps) => {
  const variantClasses = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  const clickable = typeof onClick === 'function';
  const baseClass = 'p-6 transition-shadow duration-200';
  const clickableClass = 'cursor-pointer hover:shadow-[var(--shadow-hover)] hover:scale-105 transform-gpu transition-all duration-200 hover:animate-pulse focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';

  const handleKeyDown = (e: any) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      className={`${baseClass} ${clickable ? clickableClass : 'hover:shadow-[var(--shadow-hover)]'}`}
      {...(clickable ? { role: 'button', tabIndex: 0, onClick, onKeyDown: handleKeyDown } : {})}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-secondary ${variantClasses[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
