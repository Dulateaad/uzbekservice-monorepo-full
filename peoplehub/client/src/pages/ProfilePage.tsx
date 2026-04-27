import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Star, Shield, Car, Phone, History,
  LogOut, ChevronRight, RefreshCw, MapPin, Check, Camera
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { resetUserProfile, updateUserCity, uploadAvatar } from '../services/firebase';
import { CITIES, type City } from '../config/cities';
import TrustBadge from '../components/common/TrustBadge';
import Button from '../components/common/Button';
import CameraAvatarCapture from '../components/profile/CameraAvatarCapture';

export default function ProfilePage() {
  const { user, userId, clearAuth, setAuth } = useStore();
  const { tg } = useTelegram();
  const navigate = useNavigate();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearchQ, setCitySearchQ] = useState('');
  const [savingCity, setSavingCity] = useState(false);
  const [showAvatarCamera, setShowAvatarCamera] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  async function doLogout() {
    try {
      if (userId) {
        await resetUserProfile(userId);
      }
    } catch (err) {
      console.error('Failed to reset profile:', err);
    }
    clearAuth();
    navigate('/auth', { replace: true });
  }

  function handleLogout() {
    if (tg?.showConfirm) {
      tg.showConfirm('Выйти из аккаунта? При следующем входе нужно будет заново выбрать роль.', (confirmed) => {
        if (confirmed) doLogout();
      });
    } else {
      const confirmed = window.confirm('Выйти из аккаунта? При следующем входе нужно будет заново выбрать роль.');
      if (confirmed) doLogout();
    }
  }

  async function doSwitchRole() {
    setSwitchingRole(true);
    try {
      if (userId) {
        await resetUserProfile(userId);
      }
      clearAuth();
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setSwitchingRole(false);
    }
  }

  async function handleCitySelect(city: City) {
    if (!userId || !user) return;
    setSavingCity(true);
    try {
      await updateUserCity(userId, city.name, city.lat, city.lng);
      setAuth({ ...user, city: city.name, cityLat: city.lat, cityLng: city.lng } as any);
      tg?.HapticFeedback?.notificationOccurred('success');
      setShowCityPicker(false);
    } catch (err) {
      console.error('Failed to update city:', err);
    } finally {
      setSavingCity(false);
    }
  }

  function handleSwitchRole() {
    const targetRole = user?.role === 'DRIVER' ? 'Клиент' : 'Водитель';
    const msg = `Переключиться на роль «${targetRole}»? Вы перейдёте к выбору роли.`;
    if (tg?.showConfirm) {
      tg.showConfirm(msg, (confirmed) => {
        if (confirmed) doSwitchRole();
      });
    } else {
      if (window.confirm(msg)) doSwitchRole();
    }
  }

  async function handleAvatarCapture(blob: Blob) {
    if (!userId || !user) return;
    setSavingAvatar(true);
    try {
      const url = await uploadAvatar(userId, blob);
      setAuth({ ...user, avatarUrl: url } as any);
      tg?.HapticFeedback?.notificationOccurred('success');
      setShowAvatarCamera(false);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setSavingAvatar(false);
    }
  }

  if (!user) return null;

  return (
    <div className="h-full flex flex-col bg-tg-bg safe-top safe-bottom">
      {showAvatarCamera && (
        <CameraAvatarCapture
          onCapture={handleAvatarCapture}
          onCancel={() => setShowAvatarCamera(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} className="text-tg-text" />
        </button>
        <h2 className="text-lg font-bold text-tg-text">Профиль</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            onClick={() => setShowAvatarCamera(true)}
            disabled={savingAvatar}
            className="relative w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-3xl mb-3 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              '👤'
            )}
            {savingAvatar ? (
              <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <RefreshCw size={24} className="text-white animate-spin" />
              </span>
            ) : (
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                <Camera size={28} className="text-white" />
              </span>
            )}
          </button>
          <p className="text-xs text-tg-hint mb-1">
            {user.role === 'DRIVER'
              ? 'Селфи через камеру — обязательно для выхода на линию'
              : 'Нажмите, чтобы сфотографировать себя'}
          </p>
          <h3 className="text-xl font-bold text-tg-text">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-sm text-tg-hint capitalize">{user.role === 'DRIVER' ? 'Водитель' : 'Клиент'}</p>
          
          <div className="mt-3">
            <TrustBadge score={user.trustScore} size="lg" showLabel />
          </div>
        </div>

        {user.role === 'DRIVER' && (
          <div className="bg-tg-secondaryBg rounded-2xl p-4 mb-4 border border-gray-100">
            <p className="text-sm font-semibold text-tg-text mb-2">Для линии — два шага</p>
            <ol className="text-xs text-tg-hint space-y-1.5 list-decimal list-inside">
              <li>Верификация авто (техпаспорт и фото машины) в разделе верификации.</li>
              <li>Селфи в профиле только через камеру — без него на линию нельзя.</li>
            </ol>
          </div>
        )}

        {user.role === 'DRIVER' && !(user as any).selfieAvatarAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-amber-900">Селфи в профиле</p>
            <p className="text-xs text-amber-800 mt-1">
              Нажмите на аватар выше и сфотографируйте себя. Аватар из Telegram для линии не подходит.
            </p>
          </div>
        )}

        {/* Рейтинг уважения */}
        <div className="bg-tg-secondaryBg rounded-2xl p-4 mb-4">
          <h4 className="font-semibold text-sm text-tg-text mb-3 flex items-center gap-2">
            <Shield size={16} className="text-primary-500" />
            Рейтинг уважения
          </h4>
          <div className="space-y-2">
            <TrustRow label="Текущий рейтинг" value={user.trustScore.toFixed(2)} />
            <TrustRow label="Статус" value={user.status === 'ACTIVE' ? '✅ Активен' : '⚠️ ' + user.status} />
          </div>
          <p className="text-xs text-tg-hint mt-3">
            Рейтинг уважения формируется из отзывов, пунктуальности и поведения.
            Высокий балл = приоритет в запросах.
          </p>
        </div>

        {/* Driver info */}
        {user.role === 'DRIVER' && user.driverProfile && (
          <div className="bg-tg-secondaryBg rounded-2xl p-4 mb-4">
            <h4 className="font-semibold text-sm text-tg-text mb-3 flex items-center gap-2">
              <Car size={16} className="text-primary-500" />
              Автомобиль
            </h4>
            <div className="space-y-2">
              <TrustRow
                label="Автомобиль"
                value={`${user.driverProfile.carBrand} ${user.driverProfile.carModel}${user.driverProfile.carYear ? ` · ${user.driverProfile.carYear} г.` : ''}`}
              />
              <TrustRow label="Цвет" value={user.driverProfile.carColor} />
              <TrustRow label="Гос. номер" value={user.driverProfile.licensePlate} />
              <div className="flex items-center justify-between">
                <TrustRow
                  label="Верификация"
                  value={user.driverProfile.isVerified ? '✅ Подтверждён' : '❌ Не пройдена'}
                />
                {!user.driverProfile.isVerified && (
                  <button
                    onClick={() => navigate('/verification')}
                    className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg"
                  >
                    Пройти
                  </button>
                )}
              </div>
              <TrustRow
                label="Подписка"
                value={user.driverProfile.subscriptionActive ? '✅ Активна' : '❌ Неактивна'}
              />
            </div>
          </div>
        )}

        {/* Contact */}
        {user.phone && (
          <div className="bg-tg-secondaryBg rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-tg-hint" />
              <span className="text-sm text-tg-text">{user.phone}</span>
            </div>
          </div>
        )}

        {/* City */}
        <div className="bg-tg-secondaryBg rounded-2xl p-4 mb-4">
          <h4 className="font-semibold text-sm text-tg-text mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-primary-500" />
            Город
          </h4>
          {!showCityPicker ? (
            <button
              onClick={() => setShowCityPicker(true)}
              className="w-full flex items-center justify-between p-3 bg-white rounded-xl"
            >
              <span className="text-sm text-tg-text">
                {user.city || 'Не указан'}
              </span>
              <ChevronRight size={16} className="text-tg-hint" />
            </button>
          ) : (
            <div>
              <input
                value={citySearchQ}
                onChange={(e) => setCitySearchQ(e.target.value)}
                placeholder="Поиск города..."
                className="w-full bg-white rounded-xl px-4 py-2.5 text-sm text-tg-text outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                autoFocus
              />
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {CITIES
                  .filter((c) => !citySearchQ || c.name.toLowerCase().includes(citySearchQ.toLowerCase()))
                  .map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleCitySelect(city)}
                      disabled={savingCity}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        user.city === city.name ? 'bg-primary-50 text-primary-600 font-medium' : 'text-tg-text hover:bg-gray-50'
                      }`}
                    >
                      <MapPin size={14} className={user.city === city.name ? 'text-primary-500' : 'text-tg-hint'} />
                      <span className="flex-1">{city.name}</span>
                      {user.city === city.name && <Check size={14} className="text-primary-500" />}
                    </button>
                  ))
                }
              </div>
              <button
                onClick={() => setShowCityPicker(false)}
                className="w-full text-center text-xs text-tg-hint mt-2 py-1"
              >
                Отмена
              </button>
            </div>
          )}
          <p className="text-xs text-tg-hint mt-2">
            Карта будет открываться в выбранном городе
          </p>
        </div>

        {/* Menu */}
        <div className="space-y-1 mb-6">
          <MenuButton
            icon={<MapPin size={18} />}
            label={user.role === 'DRIVER' ? 'Карта и линия' : 'Карта и запрос'}
            onClick={() => navigate(user.role === 'DRIVER' ? '/driver' : '/client')}
          />
          <MenuButton
            icon={<History size={18} />}
            label="История поездок"
            onClick={() => navigate('/history')}
          />
          <MenuButton
            icon={<RefreshCw size={18} />}
            label={`Переключить роль → ${user.role === 'DRIVER' ? 'Клиент' : 'Водитель'}`}
            onClick={handleSwitchRole}
          />
        </div>

        {/* Logout */}
        <div className="space-y-2">
          <Button
            fullWidth
            variant="secondary"
            icon={<RefreshCw size={18} />}
            loading={switchingRole}
            onClick={handleSwitchRole}
          >
            Сменить роль
          </Button>
          <Button
            fullWidth
            variant="danger"
            icon={<LogOut size={18} />}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </div>

        {/* Codex */}
        <div className="mt-6 text-center">
          <p className="text-xs text-tg-hint">
            Кодекс PeopleHub {user.codexAccepted ? '✅ принят' : '❌ не принят'}
          </p>
          <p className="text-xs text-tg-hint mt-1">
            "Дисциплина и честность выгоднее хитрости"
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-tg-hint">{label}</span>
      <span className="text-xs text-tg-text font-medium">{value}</span>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-tg-secondaryBg rounded-xl"
    >
      <span className="text-tg-hint">{icon}</span>
      <span className="flex-1 text-sm text-tg-text text-left">{label}</span>
      <ChevronRight size={16} className="text-tg-hint" />
    </button>
  );
}
