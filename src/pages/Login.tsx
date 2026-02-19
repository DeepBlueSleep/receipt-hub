import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, LogIn, AlertCircle } from 'lucide-react';

interface Center {
  id: string;
  name: string;
  code: string;
}

const Login = () => {
  const navigate = useNavigate();
  const { signIn, profile } = useAuth();
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    supabase.from('centers').select('*').order('name').then(({ data }) => {
      if (data) setCenters(data);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenter) {
      setError('Please select your center.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, hsl(218, 65%, 18%) 0%, hsl(218, 60%, 28%) 50%, hsl(197, 71%, 35%) 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ClaimPortal</h1>
              <p className="text-white/70 text-sm">Receipt Management System</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            Streamline your receipt claims
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            A unified portal for teachers to submit receipts, centers to review and process, and HQ to confirm and push to Xero.
          </p>

          <div className="space-y-4">
            {[
              { label: 'Teacher', desc: 'Upload and track your receipt claims' },
              { label: 'Center', desc: 'Review receipts and manage your team' },
              { label: 'HQ', desc: 'Full oversight, Xero integration & bulk actions' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                <div>
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-white/60 text-sm ml-2">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ClaimPortal</h1>
              <p className="text-muted-foreground text-xs">Receipt Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="center" className="text-sm font-medium text-foreground">Center</Label>
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger id="center" className="h-11">
                  <SelectValue placeholder="Select your center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email / Username</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
