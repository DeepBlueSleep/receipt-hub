import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Building2,
  LayoutDashboard,
  Receipt,
  Users,
  Send,
  LogOut,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['hq', 'center', 'teacher'] },
  { label: 'My Receipts', href: '/receipts', icon: Receipt, roles: ['teacher'] },
  { label: 'All Receipts', href: '/receipts', icon: Receipt, roles: ['hq', 'center'] },
  { label: 'Upload Receipt', href: '/upload', icon: FileText, roles: ['teacher'] },
  { label: 'Manage Users', href: '/users', icon: Users, roles: ['center', 'hq'] },
  { label: 'Xero & Email', href: '/xero', icon: Send, roles: ['hq'] },
];

const Sidebar = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const roleLabel: Record<string, string> = {
    hq: 'HQ',
    center: 'Center',
    teacher: 'Teacher',
  };

  const roleBadgeClass: Record<string, string> = {
    hq: 'bg-purple-100 text-purple-700',
    center: 'bg-teal-100 text-teal-700',
    teacher: 'bg-blue-100 text-blue-700',
  };

  const filtered = navItems.filter((item) => profile?.role && item.roles.includes(profile.role));

  return (
    <div className="flex flex-col h-full w-64 shrink-0 sidebar-nav text-white">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">ClaimPortal</p>
            <p className="text-white/60 text-xs">Receipt Management</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-white/10">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="font-semibold text-sm truncate">{profile?.full_name || 'User'}</p>
          <p className="text-white/60 text-xs truncate mt-0.5">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', profile?.role ? roleBadgeClass[profile.role] : '')}>
              {profile?.role ? roleLabel[profile.role] : ''}
            </span>
            {profile?.center_name && (
              <span className="text-white/50 text-xs truncate">· {profile.center_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filtered.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href + item.label}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-white/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-white/10 h-10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
