import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Eye, FileDown, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface Receipt {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  receipt_date: string;
  status: 'Pending' | 'Processed';
  processed_date: string | null;
  uploaded_at: string;
  file_url: string | null;
  file_name: string | null;
  xero_pushed: boolean;
  hq_confirmed: boolean;
  notes: string | null;
  teacher?: { full_name: string; email: string };
  center?: { name: string };
}

interface ReceiptTableProps {
  receipts: Receipt[];
  selectable?: boolean;
  onSelect?: (ids: string[]) => void;
  onViewReceipt?: (receipt: Receipt) => void;
  onProcess?: (receipt: Receipt) => void;
  showCenter?: boolean;
  showTeacher?: boolean;
  canProcess?: boolean;
}

const ReceiptTable: React.FC<ReceiptTableProps> = ({
  receipts,
  selectable = false,
  onSelect,
  onViewReceipt,
  onProcess,
  showCenter = false,
  showTeacher = false,
  canProcess = false,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelect?.(Array.from(next));
  };

  const toggleAll = () => {
    if (selected.size === receipts.length) {
      setSelected(new Set());
      onSelect?.([]);
    } else {
      const all = new Set(receipts.map((r) => r.id));
      setSelected(all);
      onSelect?.(Array.from(all));
    }
  };

  const allSelected = receipts.length > 0 && selected.size === receipts.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
            )}
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Title</th>
            {showTeacher && <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Teacher</th>}
            {showCenter && <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Center</th>}
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Processed</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Xero</th>
            <th className="w-24 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {receipts.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-12 text-muted-foreground">
                No receipts found.
              </td>
            </tr>
          )}
          {receipts.map((receipt) => (
            <tr
              key={receipt.id}
              className={cn(
                'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                selected.has(receipt.id) && 'bg-primary/5'
              )}
            >
              {selectable && (
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.has(receipt.id)}
                    onCheckedChange={() => toggleSelect(receipt.id)}
                  />
                </td>
              )}
              <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">{receipt.title}</td>
              {showTeacher && (
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  <div>{receipt.teacher?.full_name}</div>
                  <div className="text-muted-foreground/60">{receipt.teacher?.email}</div>
                </td>
              )}
              {showCenter && (
                <td className="px-4 py-3 text-muted-foreground">{receipt.center?.name}</td>
              )}
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                RM {Number(receipt.amount).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {format(new Date(receipt.receipt_date), 'dd MMM yyyy')}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={receipt.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {receipt.processed_date
                  ? format(new Date(receipt.processed_date), 'dd MMM yyyy HH:mm')
                  : '—'}
              </td>
              <td className="px-4 py-3">
                {receipt.xero_pushed ? (
                  <span className="text-xs status-processed flex items-center gap-1 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pushed
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  {receipt.file_url && (
                    <a href={receipt.file_url} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onViewReceipt?.(receipt)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {canProcess && receipt.status === 'Pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onProcess?.(receipt)}
                    >
                      Process
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptTable;
