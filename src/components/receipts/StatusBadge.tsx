import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'Pending' | 'Processed';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
      status === 'Pending' ? 'status-pending' : 'status-processed',
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'Pending' ? 'bg-amber-500' : 'bg-green-600')} />
      {status}
    </span>
  );
};

export default StatusBadge;
