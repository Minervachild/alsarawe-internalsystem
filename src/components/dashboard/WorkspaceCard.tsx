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
      className="workspace-card"
      onClick={() => navigate(href)}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground text-center mt-1">{description}</p>
    </div>
  );
}
