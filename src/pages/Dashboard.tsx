import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Receipt as ReceiptIcon, Clock, CheckCircle2, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  total: number;
  pending: number;
  processed: number;
  totalAmount: number;
  teacherCount?: number;
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, processed: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    try {
      let query = supabase.from('receipts').select('status, amount');

      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      } else if (profile?.role === 'center') {
        query = query.eq('center_id', profile.center_id as string);
      }

      const { data } = await query;

      if (data) {
        const pending = data.filter((r) => r.status === 'Pending').length;
        const processed = data.filter((r) => r.status === 'Processed').length;
        const totalAmount = data.reduce((sum, r) => sum + Number(r.amount), 0);
        setStats({ total: data.length, pending, processed, totalAmount });
      }
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const roleLabel: Record<string, string> = { hq: 'HQ', center: 'Center Admin', teacher: 'Teacher' };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`${greeting()}, ${profile?.full_name || 'User'}!`}
    >
      {/* Role badge */}
      <div className="mb-6 inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-primary" />
        {profile?.role ? roleLabel[profile.role] : ''}
        {profile?.center_name && ` · ${profile.center_name}`}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard icon={ReceiptIcon} label="Total Receipts" value={stats.total} color="bg-primary" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-amber-500" />
          <StatCard icon={CheckCircle2} label="Processed" value={stats.processed} color="bg-green-600" />
          <StatCard icon={TrendingUp} label="Total Amount" value={`RM ${stats.totalAmount.toFixed(2)}`} color="bg-accent" />
        </div>
      )}

      {/* Quick actions */}
      <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profile?.role === 'teacher' && (
          <>
            <Link to="/upload" className="block p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <ReceiptIcon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary">Upload Receipt</h3>
              <p className="text-sm text-muted-foreground mt-1">Submit a new receipt claim</p>
            </Link>
            <Link to="/receipts" className="block p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary">View My Claims</h3>
              <p className="text-sm text-muted-foreground mt-1">Track your receipt submissions</p>
            </Link>
          </>
        )}

        {(profile?.role === 'center' || profile?.role === 'hq') && (
          <>
            <Link to="/receipts" className="block p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <ReceiptIcon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary">All Receipts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.role === 'center' ? 'View and process center receipts' : 'View all receipts across centers'}
              </p>
            </Link>
            <Link to="/users" className="block p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary">Manage Users</h3>
              <p className="text-sm text-muted-foreground mt-1">Add and manage team members</p>
            </Link>
            {profile.role === 'hq' && (
              <Link to="/xero" className="block p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">Xero & Email</h3>
                <p className="text-sm text-muted-foreground mt-1">Push to Xero and notify teachers</p>
              </Link>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
