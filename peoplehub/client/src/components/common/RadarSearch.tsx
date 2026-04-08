/**
 * Анимация радара при поиске машины/водителя.
 * Радар идёт от точки пользователя; в центре — пульсирующий круг и буква «Я».
 */

interface RadarSearchProps {
  /** Размер контейнера (px). По умолчанию 120. */
  size?: number;
  /** Дополнительные классы контейнера */
  className?: string;
  /** В центре показывать «Я» (пользователь) с пульсирующим кругом */
  showMe?: boolean;
}

export default function RadarSearch({ size = 120, className = '', showMe = false }: RadarSearchProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Расширяющиеся кольца — радар от этой точки */}
      <div className="radar-ring" style={{ width: size * 0.5, height: size * 0.5 }} />
      <div className="radar-ring" style={{ width: size * 0.5, height: size * 0.5 }} />
      <div className="radar-ring" style={{ width: size * 0.5, height: size * 0.5 }} />
      <div className="radar-ring" style={{ width: size * 0.5, height: size * 0.5 }} />

      {/* Вращающаяся линия сканирования */}
      <div
        className="radar-sweep-line"
        style={{
          height: `${size * 0.4}px`,
          marginLeft: '-1px',
        }}
      />

      {/* Центр: пульсирующий круг + «Я» или точка */}
      {showMe ? (
        <div className="absolute flex items-center justify-center">
          <div className="radar-pulse-circle" />
          <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center z-10">
            <span className="text-white text-sm font-bold">Я</span>
          </div>
        </div>
      ) : (
        <div
          className="absolute w-3 h-3 rounded-full bg-primary-500 shadow-lg"
          style={{ boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)' }}
        />
      )}
    </div>
  );
}
