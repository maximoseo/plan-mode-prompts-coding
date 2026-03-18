import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useModelSelection } from '@/hooks/useModelSelection';
import { ModelSelector } from '@/components/ModelSelector';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { selectedModel, selectModel, availableModels, isLoading } = useModelSelection();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-sidebar-bg px-4 md:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0 text-sidebar-foreground hover:text-sidebar-primary">
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="text-lg font-semibold truncate text-sidebar-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={selectModel}
          availableModels={availableModels}
          isLoading={isLoading}
          compact
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-sidebar-foreground hover:text-sidebar-primary"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.full_name ?? 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
