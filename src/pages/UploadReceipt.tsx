import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadReceipt = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    receipt_date: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB.');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.center_id) {
      setError('No center assigned to your account. Please contact your administrator.');
      return;
    }
    if (!file) {
      setError('Please attach a receipt file.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload file
      const filePath = `${profile.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Insert receipt record
      const { error: insertError } = await supabase.from('receipts').insert({
        teacher_id: profile.id,
        center_id: profile.center_id,
        title: form.title,
        description: form.description || null,
        amount: parseFloat(form.amount),
        receipt_date: form.receipt_date,
        file_url: publicUrl,
        file_name: file.name,
        status: 'Pending',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => navigate('/receipts'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout title="Upload Receipt">
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Receipt Submitted!</h2>
          <p className="text-muted-foreground">Your receipt has been submitted successfully. Redirecting...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Upload Receipt" subtitle="Submit a new receipt claim">
      <div className="max-w-2xl">
        <div className="bg-card rounded-xl border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Receipt Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Teaching materials, Transport claim"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (RM) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt_date">Receipt Date *</Label>
                <Input
                  id="receipt_date"
                  type="date"
                  value={form.receipt_date}
                  onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Provide details about this expense..."
                rows={3}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Receipt File *</Label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-foreground text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-foreground font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Uploading...' : 'Submit Receipt'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/receipts')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadReceipt;
