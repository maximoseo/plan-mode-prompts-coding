import { NavLink } from 'react-router-dom';
import { Code2, List, Puzzle, MessageSquare, Clock, X, Zap, Home, Globe, Sparkles, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/websites', icon: Globe, label: 'Websites' },
  { to: '/ai-coding-generator', icon: Code2, label: 'AI Coding' },
  { to: '/improve', icon: Sparkles, label: 'Improve' },
  { to: '/swarm', icon: ZapOff, label: 'Swarm' },
  { to: '/templates', icon: List, label: 'Templates' },
  { to: '/templates/new', icon: Puzzle, label: 'Builder' },
  { to: '/playground', icon: MessageSquare, label: 'Playground' },
  { to: '/history', icon: Clock, label: 'History' },
];

export function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-sidebar-bg border-r border-sidebar-accent shadow-sm transition-all duration-300 ease-in-out',
          'md:z-30 md:translate-x-0',
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:w-16'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-accent">
            {isOpen && (
              <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-white" onClick={onClose}>
                <Zap className="h-5 w-5 text-sidebar-primary" />
                <span className="truncate">Maximo SEO</span>
              </NavLink>
            )}
            {!isOpen && (
              <Button variant="ghost" size="icon" onClick={onToggle} className="mx-auto">
                <Zap className="h-5 w-5 text-sidebar-primary" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 text-sidebar-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary',
                    !isOpen && 'justify-center px-2'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isOpen && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-sidebar-accent p-2 hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="w-full text-sidebar-foreground hover:text-sidebar-primary"
            >
              <span className={cn('transition-transform duration-300', isOpen ? 'rotate-180' : '')}>
                &lsaquo;
              </span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
