import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReceiptTable, { Receipt } from '@/components/receipts/ReceiptTable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Send, Eye, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/receipts/StatusBadge';
import { cn } from '@/lib/utils';

const XeroEmail = () => {
  const { profile } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showXeroDialog, setShowXeroDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [xeroLoading, setXeroLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [xeroSuccess, setXeroSuccess] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [xeroConfirmChecks, setXeroConfirmChecks] = useState<Record<string, boolean>>({});

  const [emailForm, setEmailForm] = useState({
    subject: 'Your Receipt Claim Has Been Processed',
    body: `Dear {teacher_name},\n\nWe are pleased to inform you that your receipt claim has been processed successfully.\n\nClaim Details:\n{receipt_details}\n\nProcessed Date: {processed_date}\n\nPlease contact us if you have any questions.\n\nBest regards,\nHQ Team`,
  });

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('receipts')
        .select('*, teacher:profiles!receipts_teacher_id_fkey(full_name, email), center:centers(name)')
        .order('uploaded_at', { ascending: false });
      setReceipts((data as any[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const selectedReceipts = receipts.filter((r) => selectedIds.includes(r.id));
  const selectedProcessed = selectedReceipts.filter((r) => r.status === 'Processed');

  const buildEmailPreview = (receipt: Receipt) => {
    const details = `• ${receipt.title}: RM ${Number(receipt.amount).toFixed(2)} (${format(new Date(receipt.receipt_date), 'dd MMM yyyy')})`;
    return emailForm.body
      .replace(/{teacher_name}/g, receipt.teacher?.full_name || 'Teacher')
      .replace(/{receipt_details}/g, details)
      .replace(/{processed_date}/g, receipt.processed_date ? format(new Date(receipt.processed_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy'));
  };

  const handleXeroPush = async () => {
    setXeroLoading(true);
    try {
      await Promise.all(
        selectedProcessed.map((r) =>
          supabase
            .from('receipts')
            .update({ xero_pushed: true, xero_pushed_at: new Date().toISOString(), hq_confirmed: true })
            .eq('id', r.id)
        )
      );
      setXeroSuccess(true);
      await fetchReceipts();
      setTimeout(() => {
        setXeroSuccess(false);
        setShowXeroDialog(false);
        setXeroConfirmChecks({});
      }, 2000);
    } finally {
      setXeroLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailLoading(true);
    try {
      const recipientEmails = [...new Set(selectedProcessed.map((r) => r.teacher?.email).filter(Boolean))] as string[];
      await supabase.from('email_logs').insert({
        sent_by: profile!.id,
        recipient_emails: recipientEmails,
        subject: emailForm.subject,
        body: emailForm.body,
        receipt_ids: selectedProcessed.map((r) => r.id),
      });
      setEmailSuccess(true);
      setTimeout(() => {
        setEmailSuccess(false);
        setShowEmailDialog(false);
      }, 2000);
    } finally {
      setEmailLoading(false);
    }
  };

  const allXeroChecked = selectedProcessed.every((r) => xeroConfirmChecks[r.id]);

  return (
    <DashboardLayout
      title="Xero & Email"
      subtitle="Push processed receipts to Xero and notify teachers"
    >
      {/* Action bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button
          disabled={selectedProcessed.length === 0}
          onClick={() => {
            const checks: Record<string, boolean> = {};
            selectedProcessed.forEach((r) => { checks[r.id] = false; });
            setXeroConfirmChecks(checks);
            setShowXeroDialog(true);
          }}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Push to Xero ({selectedProcessed.length})
        </Button>
        <Button
          variant="outline"
          disabled={selectedProcessed.length === 0}
          onClick={() => setShowEmailDialog(true)}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Send Email to Teachers ({selectedProcessed.length})
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-primary/10 rounded-lg text-sm text-primary font-medium">
          {selectedIds.length} selected ({selectedProcessed.length} processed, {selectedIds.length - selectedProcessed.length} pending)
        </div>
      )}

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center animate-pulse text-muted-foreground">Loading...</div>
      ) : (
        <ReceiptTable
          receipts={receipts}
          selectable
          onSelect={setSelectedIds}
          onViewReceipt={() => {}}
          showTeacher
          showCenter
        />
      )}

      {/* Xero Confirmation Dialog */}
      <Dialog open={showXeroDialog} onOpenChange={setShowXeroDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Confirm Xero Push
            </DialogTitle>
          </DialogHeader>

          {xeroSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-foreground">Successfully pushed to Xero!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Please review and confirm each receipt before pushing to Xero. This action cannot be undone.
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {selectedProcessed.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'border rounded-xl p-4 transition-colors',
                      xeroConfirmChecks[r.id] ? 'border-green-300 bg-green-50' : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={xeroConfirmChecks[r.id] || false}
                        onChange={(e) => setXeroConfirmChecks((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                        className="mt-1 w-4 h-4 accent-green-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-foreground">{r.title}</p>
                          <p className="font-bold text-foreground">RM {Number(r.amount).toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.teacher?.full_name} · {r.center?.name} · {format(new Date(r.receipt_date), 'dd MMM yyyy')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <StatusBadge status={r.status} />
                          {r.xero_pushed && (
                            <span className="text-xs text-green-600 font-medium">Already pushed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={cn(
                'flex items-center gap-2 text-sm rounded-lg px-3 py-2 mt-2',
                allXeroChecked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              )}>
                {allXeroChecked
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {allXeroChecked
                  ? 'All receipts confirmed. Ready to push.'
                  : `${selectedProcessed.filter((r) => !xeroConfirmChecks[r.id]).length} receipt(s) still need confirmation.`}
              </div>
            </>
          )}

          {!xeroSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowXeroDialog(false)}>Cancel</Button>
              <Button onClick={handleXeroPush} disabled={!allXeroChecked || xeroLoading} className="gap-2">
                {xeroLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm & Push to Xero
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Email to Teachers
            </DialogTitle>
          </DialogHeader>

          {emailSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-foreground">Emails logged successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">Sent to {selectedProcessed.length} teacher(s)</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-1">
                Recipients: <span className="font-medium text-foreground">
                  {[...new Set(selectedProcessed.map((r) => r.teacher?.full_name).filter(Boolean))].join(', ')}
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant={!showEmailPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowEmailPreview(false)}
                >
                  Edit
                </Button>
                <Button
                  variant={showEmailPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowEmailPreview(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </div>

              {showEmailPreview ? (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted px-4 py-2 text-xs text-muted-foreground border-b">
                    <span className="font-medium">Subject:</span> {emailForm.subject}
                  </div>
                  <div className="p-4 max-h-72 overflow-y-auto">
                    {selectedProcessed.slice(0, 1).map((r) => (
                      <div key={r.id}>
                        <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-foreground">
                          {buildEmailPreview(r)}
                        </pre>
                      </div>
                    ))}
                    {selectedProcessed.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        + {selectedProcessed.length - 1} more personalized email(s) will be sent
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <p className="text-xs text-muted-foreground">
                      Use <code className="bg-muted px-1 rounded">{'{teacher_name}'}</code>, <code className="bg-muted px-1 rounded">{'{receipt_details}'}</code>, <code className="bg-muted px-1 rounded">{'{processed_date}'}</code>
                    </p>
                    <Textarea
                      value={emailForm.body}
                      onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!emailSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
              <Button onClick={handleSendEmail} disabled={emailLoading} className="gap-2">
                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Emails ({selectedProcessed.length})
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default XeroEmail;
