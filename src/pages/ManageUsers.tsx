import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'hq' | 'center' | 'teacher';
  center_id: string | null;
  created_at: string;
  center?: { name: string };
}

interface Center {
  id: string;
  name: string;
  code: string;
}

const ManageUsers = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher' as 'hq' | 'center' | 'teacher',
    center_id: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchCenters();
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*, center:centers(name)')
        .order('created_at', { ascending: false });

      if (profile?.role === 'center' && profile.center_id) {
        query = query.eq('center_id', profile.center_id);
      }

      const { data } = await query;
      setUsers((data as any[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    const { data } = await supabase.from('centers').select('*').order('name');
    if (data) setCenters(data);
  };

  const handleAddUser = async () => {
    if (!form.email || !form.password || !form.full_name) {
      setError('Please fill in all required fields.');
      return;
    }
    setFormLoading(true);
    setError('');

    try {
      const centerId = profile?.role === 'center' ? profile.center_id : form.center_id || null;
      const { error: signUpError } = await supabase.auth.admin
        ? await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.full_name,
              role: form.role,
            },
          },
        })
        : await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.full_name,
              role: form.role,
            },
          },
        });

      if (signUpError) throw signUpError;

      // Update center_id if needed (via timeout to wait for trigger)
      if (centerId) {
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .update({ center_id: centerId })
            .eq('email', form.email);
          fetchUsers();
        }, 1500);
      }

      setShowAddDialog(false);
      setForm({ email: '', password: '', full_name: '', role: 'teacher', center_id: '' });
      setTimeout(fetchUsers, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    hq: 'bg-purple-100 text-purple-700',
    center: 'bg-teal-100 text-teal-700',
    teacher: 'bg-blue-100 text-blue-700',
  };

  return (
    <DashboardLayout
      title="Manage Users"
      subtitle={`${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
      actions={
        <Button size="sm" className="gap-2" onClick={() => { setError(''); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      }
    >
      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center animate-pulse text-muted-foreground">Loading users...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Center</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Joined</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{(u as any).center?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(u.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === profile?.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profile?.role === 'hq' && <SelectItem value="hq">HQ</SelectItem>}
                  {profile?.role === 'hq' && <SelectItem value="center">Center</SelectItem>}
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {profile?.role === 'hq' && (
              <div className="space-y-2">
                <Label>Center</Label>
                <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select center (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={formLoading}>
              {formLoading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ManageUsers;
