import { useState } from 'react';
import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';
import { GenreSidebar } from './GenreSidebar.jsx';

export function AppShell({ children, genre, onGenre, showSidebar = true }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#050508]">
      <Navbar />
      <div className="flex flex-1">
        {showSidebar && (
          <>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-900/40 lg:hidden"
              aria-label="التصنيفات"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <GenreSidebar activeGenre={genre} onGenre={onGenre} mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />
          </>
        )}
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
