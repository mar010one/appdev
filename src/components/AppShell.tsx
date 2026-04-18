'use client';

import { BookOpen, Building2, ClipboardList, LayoutDashboard, LogOut, Settings, Smartphone, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { AuthUser, canAccess, getCurrentUser, logout } from '@/lib/auth';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  const isPublic = pathname.startsWith('/share');
  const isLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (isPublic || isLogin) {
      setChecked(true);
      return;
    }
    const current = getCurrentUser();
    if (!current) {
      router.replace('/login');
      return;
    }
    if (!canAccess(current, pathname)) {
      router.replace('/');
      return;
    }
    setUser(current);
    setChecked(true);
  }, [pathname, isPublic, isLogin, router]);

  if (isPublic) {
    return (
      <div className="public-shell">
        <main className="public-main">{children}</main>
      </div>
    );
  }

  if (isLogin) {
    return <main className="login-main">{children}</main>;
  }

  if (!checked || !user) {
    return <div className="auth-loading">Loading…</div>;
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="layout-wrapper">
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">A</div>
          <span className="logo-text">AppManager<span className="gold">Pro</span></span>
        </div>

        <nav className="nav-menu">
          <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </Link>
          <Link href="/accounts" className={`nav-item ${pathname.startsWith('/accounts') ? 'active' : ''}`}>
            <Users size={20} />
            <span>Client Accounts</span>
          </Link>
          <Link href="/apps" className={`nav-item ${pathname.startsWith('/apps') ? 'active' : ''}`}>
            <Smartphone size={20} />
            <span>Applications</span>
          </Link>
          <Link href="/companies" className={`nav-item ${pathname.startsWith('/companies') ? 'active' : ''}`}>
            <Building2 size={20} />
            <span>Companies</span>
          </Link>
          {user.role === 'admin' && (
            <Link href="/expenses" className={`nav-item ${pathname.startsWith('/expenses') ? 'active' : ''}`}>
              <Wallet size={20} />
              <span>Charges</span>
            </Link>
          )}
          <Link href="/missions" className={`nav-item ${pathname.startsWith('/missions') ? 'active' : ''}`}>
            <ClipboardList size={20} />
            <span>Missions</span>
          </Link>
          <Link href="/tutorials" className={`nav-item ${pathname.startsWith('/tutorials') ? 'active' : ''}`}>
            <BookOpen size={20} />
            <span>Tutorials</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user.email.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <span className="user-email">{user.email}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          <div className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <button type="button" className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
