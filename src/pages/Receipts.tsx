import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReceiptTable, { Receipt } from '@/components/receipts/ReceiptTable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/receipts/StatusBadge';
import { format } from 'date-fns';

const Receipts = () => {
  const { profile } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (profile) fetchReceipts();
  }, [profile]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('receipts')
        .select('*, teacher:profiles!receipts_teacher_id_fkey(full_name, email), center:centers(name)')
        .order('uploaded_at', { ascending: false });

      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      } else if (profile?.role === 'center' && profile.center_id) {
        query = query.eq('center_id', profile.center_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReceipts((data as any[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (receipt: Receipt) => {
    const { error } = await supabase
      .from('receipts')
      .update({
        status: 'Processed',
        processed_date: new Date().toISOString(),
        processed_by: profile?.id,
      })
      .eq('id', receipt.id);

    if (!error) fetchReceipts();
  };

  const filtered = receipts.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.teacher?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const canProcess = profile?.role === 'center';

  return (
    <DashboardLayout
      title={profile?.role === 'teacher' ? 'My Receipts' : 'All Receipts'}
      subtitle={`${filtered.length} receipt${filtered.length !== 1 ? 's' : ''} found`}
      actions={
        profile?.role === 'teacher' ? (
          <Link to="/upload">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Upload Receipt
            </Button>
          </Link>
        ) : undefined
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Processed">Processed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchReceipts}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground animate-pulse">
          Loading receipts...
        </div>
      ) : (
        <ReceiptTable
          receipts={filtered}
          showTeacher={profile?.role !== 'teacher'}
          showCenter={profile?.role === 'hq'}
          canProcess={canProcess}
          onProcess={handleProcess}
          onViewReceipt={setViewReceipt}
        />
      )}

      {/* View Receipt Dialog */}
      <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {viewReceipt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{viewReceipt.title}</h3>
                <StatusBadge status={viewReceipt.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-semibold">RM {Number(viewReceipt.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Receipt Date</p>
                  <p className="font-medium">{format(new Date(viewReceipt.receipt_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Uploaded</p>
                  <p className="font-medium">{format(new Date(viewReceipt.uploaded_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                {viewReceipt.processed_date && (
                  <div>
                    <p className="text-muted-foreground text-xs">Processed</p>
                    <p className="font-medium">{format(new Date(viewReceipt.processed_date), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
              {viewReceipt.teacher && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Teacher</p>
                  <p className="text-sm font-medium">{viewReceipt.teacher.full_name}</p>
                  <p className="text-xs text-muted-foreground">{viewReceipt.teacher.email}</p>
                </div>
              )}
              {viewReceipt.description && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Description</p>
                  <p className="text-sm">{viewReceipt.description}</p>
                </div>
              )}
              {viewReceipt.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm">{viewReceipt.notes}</p>
                </div>
              )}
              {viewReceipt.file_url && (
                <a href={viewReceipt.file_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full gap-2">
                    <Eye className="w-4 h-4" />
                    View File ({viewReceipt.file_name})
                  </Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Receipts;
