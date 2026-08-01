import type { GemstoneStatus } from '../../types';

interface StatusBadgeProps {
  status: GemstoneStatus;
}

const statusConfig: Record<GemstoneStatus, { label: string; className: string; dot: string }> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50',
    dot: 'bg-emerald-400',
  },
  sold: {
    label: 'Sold',
    className: 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
    dot: 'bg-blue-400',
  },
  reserved: {
    label: 'Reserved',
    className: 'bg-amber-900/40 text-amber-400 border border-amber-800/50',
    dot: 'bg-amber-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-purple-900/40 text-purple-400 border border-purple-800/50',
    dot: 'bg-purple-400',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.available;
  return (
    <span className={`status-badge ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
