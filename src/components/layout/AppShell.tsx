import { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/websites': 'Websites',
  '/ai-coding-generator': 'AI Coding Generator',
  '/improve': 'Prompt Improvement',
  '/swarm': 'Swarm Agents',
  '/templates': 'Templates',
  '/templates/new': 'Template Builder',
  '/playground': 'Playground',
  '/history': 'Execution History',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/templates/') && pathname !== '/templates/new') return 'Edit Template';
  return 'Prompt Engineering Studio';
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarWidth = isMobile ? '0' : sidebarOpen ? '16rem' : '4rem';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        className="transition-all duration-300"
        style={{
          marginLeft: sidebarWidth,
        }}
      >
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
