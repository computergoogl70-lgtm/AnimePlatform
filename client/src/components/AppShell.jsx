import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';
import { GenreSidebar } from './GenreSidebar.jsx';

export function AppShell({ children, genre, onGenre, showSidebar = true }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#050508]">
      <Navbar />
      <div className="flex flex-1">
        {showSidebar && <GenreSidebar activeGenre={genre} onGenre={onGenre} />}
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
