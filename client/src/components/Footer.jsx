import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 lg:flex-row lg:px-8">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-zinc-500">
            منصة لاكتشاف ومشاهدة الأنمي. الروابط المستخدمة مصادر خارجية.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">تصفح</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link to="/search" className="hover:text-white">
                  بحث
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white">
                  الرئيسية
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">الحساب</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link to="/login" className="hover:text-white">
                  دخول
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white">
                  إنشاء حساب
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} انمي ستريم
      </div>
    </footer>
  );
}
