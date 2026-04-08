import { Star } from 'lucide-react';

interface RespectBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getRespectColor(score: number): string {
  if (score >= 4.5) return 'text-trust-excellent bg-green-50';
  if (score >= 4.0) return 'text-trust-good bg-lime-50';
  if (score >= 3.5) return 'text-trust-neutral bg-yellow-50';
  if (score >= 3.0) return 'text-trust-warning bg-orange-50';
  return 'text-trust-danger bg-red-50';
}

function getRespectLabel(score: number): string {
  if (score >= 4.5) return 'Отлично';
  if (score >= 4.0) return 'Хорошо';
  if (score >= 3.5) return 'Нормально';
  if (score >= 3.0) return 'Внимание';
  return 'Низкий';
}

export default function TrustBadge({ score, size = 'md', showLabel = false }: RespectBadgeProps) {
  const colorClass = getRespectColor(score);
  const sizeMap = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  };
  const starSize = { sm: 10, md: 14, lg: 16 };

  return (
    <div className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeMap[size]}`}>
      <Star size={starSize[size]} fill="currentColor" />
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-75">· {getRespectLabel(score)}</span>}
    </div>
  );
}
