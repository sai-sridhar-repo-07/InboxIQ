import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
  Bell,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox',     href: '/email',     icon: Inbox },
  { label: 'Actions',   href: '/actions',   icon: CheckSquare },
  { label: 'Settings',  href: '/settings',  icon: Settings },
  { label: 'Billing',   href: '/billing',   icon: CreditCard },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const user = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [router.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setProfileOpen(false);
    try {
      await supabase.auth.signOut();
      router.push('/auth/signin');
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
      setSigningOut(false);
    }
  };

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';
  const userEmail    = user?.email ?? '';
  const displayName  = user?.user_metadata?.full_name ?? userEmail.split('@')[0];

  const NavLinks = () => (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {navItems.map((item, i) => {
        const isActive = router.pathname.startsWith(item.href);
        const { icon: Icon } = item;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              `animate-slide-in-left stagger-${i + 1}`,
              isActive
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-0.5'
            )}
          >
            <Icon
              className={clsx(
                'h-5 w-5 flex-shrink-0 transition-colors duration-150',
                isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
            {item.label}
            {isActive && <ChevronRight className="ml-auto h-4 w-4 text-primary-400" />}
          </Link>
        );
      })}
    </nav>
  );

  const UserSection = () => (
    <div className="border-t border-gray-100 p-3">
      <div className="mb-1 flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold shadow-sm">
          {userInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
      >
        <LogOut className="h-4 w-4" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:fixed lg:inset-y-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 animate-fade-in">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">InboxIQ</span>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavLinks />
          <UserSection />
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">InboxIQ</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <NavLinks />
              <UserSection />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col lg:pl-64">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && (
              <h1 className="text-base font-semibold text-gray-900 sm:text-lg truncate">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bell */}
            <button className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors relative">
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Profile menu"
              >
                {userInitials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-50 animate-slide-down">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Settings
                    </Link>
                    <Link
                      href="/billing"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      Billing
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Profile
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
