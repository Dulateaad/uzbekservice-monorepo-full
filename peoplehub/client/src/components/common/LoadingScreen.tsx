export default function LoadingScreen() {
  return (
    <div
      className="h-full min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, #f4f4f5)',
        color: 'var(--tg-theme-text-color, #1f2937)',
      }}
    >
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin"></div>
        <div className="absolute inset-3 flex items-center justify-center text-2xl">
          🚖
        </div>
      </div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--tg-theme-text-color, #1f2937)' }}>
        PeopleHub
      </h2>
      <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
        Загрузка...
      </p>
    </div>
  );
}
