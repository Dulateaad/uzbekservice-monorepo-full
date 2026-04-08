import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Car, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { loginWithTelegram } from '../services/firebase';
import { parseTelegramUserFromInitData } from '../utils/telegramInitData';
import Button from '../components/common/Button';

export default function AuthPage() {
  const { initData, tg } = useTelegram();
  const { setAuth, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user } = useStore();

  // Если уже залогинен И кодекс принят — на главную; иначе пусть заново выберет роль
  if (isAuthenticated && user?.codexAccepted) {
    navigate('/');
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-tg-bg">
        <p className="text-sm text-tg-hint">Загрузка…</p>
      </div>
    );
  }
  // Если залогинен но codex не принят — отправляем на регистрацию
  if (isAuthenticated && user && !user.codexAccepted) {
    navigate('/register', { replace: true });
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-tg-bg">
        <p className="text-sm text-tg-hint">Загрузка…</p>
      </div>
    );
  }

  async function handleLogin() {
    try {
      setLoading(true);
      setError('');

      const tgUser = initData
        ? parseTelegramUserFromInitData(initData)
        : { id: 12345678, first_name: 'Тест', last_name: 'Пользователь', username: 'testuser' };

      if (!tgUser) {
        setError('Не удалось получить данные Telegram. Откройте приложение из бота.');
        return;
      }

      const result = await loginWithTelegram(tgUser);
      setAuth(result.user as any);

      tg?.HapticFeedback?.notificationOccurred('success');

      if (result.isNewUser || !result.user.codexAccepted) {
        navigate('/register', { replace: true });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка авторизации');
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-tg-bg safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 bg-primary-100 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-5xl">🚖</span>
        </div>

        <h1 className="text-3xl font-bold text-tg-text mb-2">PeopleHub</h1>
        <p className="text-tg-hint text-center text-base mb-8 max-w-xs">
          IT-платформа для поиска попутчиков и водителей
        </p>

        <div className="w-full max-w-sm space-y-3 mb-8">
          <Feature icon={<Shield size={20} className="text-primary-500" />} title="Рейтинг уважения" desc="Система репутации для всех участников" />
          <Feature icon={<Car size={20} className="text-primary-500" />} title="0% комиссии" desc="Вся оплата идёт водителю" />
          <Feature icon={<Users size={20} className="text-primary-500" />} title="Оплата по договорённости" desc="Наличные или перевод — как удобно" />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 mb-4 text-sm">{error}</div>
        )}
      </div>

      <div className="px-6 pb-6">
        <Button fullWidth size="lg" loading={loading} onClick={handleLogin}>
          {initData ? 'Войти через Telegram' : 'Войти (тест)'}
        </Button>
        <p className="text-xs text-tg-hint text-center mt-3">
          Нажимая кнопку, вы соглашаетесь с условиями сервиса
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 bg-tg-secondaryBg rounded-xl px-4 py-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="font-medium text-sm text-tg-text">{title}</p>
        <p className="text-xs text-tg-hint">{desc}</p>
      </div>
    </div>
  );
}
