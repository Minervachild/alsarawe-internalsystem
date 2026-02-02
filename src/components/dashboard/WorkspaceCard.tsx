import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

export function WorkspaceCard({ title, description, icon: Icon, href, color }: WorkspaceCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="workspace-card group"
      onClick={() => navigate(href)}
    >
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-foreground text-base">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mt-1">{description}</p>
    </div>
  );
}
