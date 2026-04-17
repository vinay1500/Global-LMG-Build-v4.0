import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Outlet, useNavigate } from 'react-router';
import { AdminContextPanel } from './AdminContextPanel';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useAdminSession } from '../providers/AdminSessionProvider';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAdminSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((previous) => !previous);
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchNavigation = useMemo(
    () => ({
      Client: (id: string) => navigate(`/clients/${id}`),
      Document: (_id: string) => navigate('/documents'),
      Matter: (id: string) => navigate(`/matters/${id}`),
      Message: (_id: string) => navigate('/messages'),
    }),
    [navigate]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] font-sans selection:bg-[#2C2B29] selection:text-[#FCFBF8]">
      <AdminTopbar
        currentUser={currentUser}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex min-h-[calc(100vh-64px)]">
        <AnimatePresence>
          {sidebarOpen ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-[#2C2B29]/20 backdrop-blur-sm z-40 lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}
        </AnimatePresence>

        <div
          className={`fixed lg:static z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AdminSidebar onNavigate={() => setSidebarOpen(false)} onSignOut={handleSignOut} />
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <AdminBreadcrumbs
            onToggleContextPanel={() => setRightPanelOpen((previous) => !previous)}
            rightPanelOpen={rightPanelOpen}
          />

          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
              <Outlet />
            </div>

            <AnimatePresence>
              {rightPanelOpen ? (
                <>
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-[#2C2B29]/20 backdrop-blur-sm z-40 xl:hidden"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    onClick={() => setRightPanelOpen(false)}
                  />
                  <motion.div
                    animate={{ x: 0 }}
                    className="z-50 xl:z-0"
                    exit={{ x: '100%' }}
                    initial={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  >
                    <AdminContextPanel onClose={() => setRightPanelOpen(false)} />
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(result) => {
          searchNavigation[result.type](result.id);
          setSearchOpen(false);
        }}
      />
    </div>
  );
};
