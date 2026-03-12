import type { WaypointType } from '../types';

interface Props {
  type: WaypointType;
  size?: number;
}

const ICONS: Record<WaypointType, { emoji: string; bg: string }> = {
  parking:   { emoji: '🅿', bg: '#3b82f6' },
  water:     { emoji: '💧', bg: '#06b6d4' },
  restroom:  { emoji: '🚻', bg: '#8b5cf6' },
  viewpoint: { emoji: '👁', bg: '#f59e0b' },
  caution:   { emoji: '⚠', bg: '#ef4444' },
  custom:    { emoji: '📍', bg: '#22c55e' },
};

export function WaypointIcon({ type, size = 24 }: Props) {
  const { emoji, bg } = ICONS[type] ?? ICONS.custom;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.55,
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}
    >
      {emoji}
    </div>
  );
}
