import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useTelegram } from './hooks/useTelegram';
import { useVersionCheck } from './hooks/useVersionCheck';
import { loginWithTelegram, getMe, updateUserCity } from './services/firebase';
import { parseTelegramUserFromInitData } from './utils/telegramInitData';
import { featureFlags, getSelectedProduct } from './config/features';
import { detectCityByGPS } from './config/cities';
import { trackAppOpen, trackError } from './services/analytics';

// Pages — Global Router
import HubPage from './pages/HubPage';
import SafeModePage from './pages/SafeModePage';
import ComingSoonPage from './pages/ComingSoonPage';

// Pages — Auth
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';

// Pages — Taxi Product
import ClientHomePage from './pages/ClientHomePage';
import DriverHomePage from './pages/DriverHomePage';
import TripActivePage from './pages/TripActivePage';
import ChatPage from './pages/ChatPage';

// Pages — Shared
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';

// Pages — Verification & Admin
import DriverVerificationPage from './pages/DriverVerificationPage';
import AdminPage from './pages/AdminPage';

// Components
import LoadingScreen from './components/common/LoadingScreen';

export default function App() {
  const { tg, initData, isDark } = useTelegram();
  const { user, userId, isAuthenticated, setAuth, clearAuth, setLoading } = useStore();
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  useVersionCheck();

  useEffect(() => {
    initializeApp();
    // Не зависать на загрузке: через 12 сек показать интерфейс
    const t = setTimeout(() => {
      setInitializing((v) => (v ? false : v));
    }, 12000);
    return () => clearTimeout(t);
  }, []);

  /** В Telegram WebView initData иногда появляется чуть позже первого кадра — ждём, иначе логин не срабатывает */
  async function waitForTelegramInitData(maxMs = 2000) {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    if (!tg) return;
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (tg.initData && String(tg.initData).length > 0) return;
      await new Promise((r) => setTimeout(r, 40));
    }
  }

  async function initializeApp() {
    try {
      setLoading(true);
      await waitForTelegramInitData();
      trackAppOpen(userId || undefined);

      let loggedInUser: any = null;
      let loggedInId: string | null = null;

      if (userId) {
        try {
          const me = await getMe(userId);
          setAuth(me as any);
          loggedInUser = me;
          loggedInId = userId;
          if (!me.codexAccepted) {
            navigate('/register', { replace: true });
          }
        } catch {
          clearAuth();
        }
      } else if (initData) {
        const tgUser = parseTelegramUserFromInitData(initData);
        if (tgUser) {
          try {
            const result = await loginWithTelegram(tgUser);
            setAuth(result.user as any);
            loggedInUser = result.user;
            loggedInId = result.user.id;
            if (result.isNewUser || !result.user.codexAccepted) {
              navigate('/register', { replace: true });
            }
          } catch (err) {
            console.error('Login error:', err);
          }
        }
      }

      // Auto-detect city if user doesn't have one
      if (loggedInUser && loggedInId && !loggedInUser.city) {
        detectCityByGPS().then((city) => {
          if (city && loggedInId) {
            updateUserCity(loggedInId, city.name, city.lat, city.lng).then(() => {
              setAuth({ ...loggedInUser, city: city.name, cityLat: city.lat, cityLng: city.lng });
            }).catch(() => {});
          }
        });
      }
    } catch (err) {
      trackError(err, 'initializeApp');
    } finally {
      setInitializing(false);
      setLoading(false);
    }
  }

  if (initializing) {
    return <LoadingScreen />;
  }

  const flags = featureFlags.getFlags();

  // Global maintenance mode
  if (flags.maintenanceMode) {
    return (
      <div className={`h-full ${isDark ? 'dark' : ''}`}>
        <SafeModePage />
      </div>
    );
  }

  // Smart home route: if user already selected a product, go directly
  function getHomeRoute() {
    if (!isAuthenticated) return <Navigate to="/auth" />;
    if (!user?.codexAccepted) return <Navigate to="/register" replace />;

    const savedProduct = getSelectedProduct();
    if (savedProduct === 'TAXI') {
      // Редирект по роли только когда роль уже известна — иначе водитель мог бы попасть на /client
      if (user?.role === 'DRIVER') return <Navigate to="/driver" replace />;
      if (user?.role === 'CLIENT') return <Navigate to="/client" replace />;
      // Роль ещё не подгружена (getMe в процессе) — на хаб, оттуда по кнопке Такси уйдём на нужный экран
      return <Navigate to="/hub" replace />;
    }

    return <Navigate to="/hub" replace />;
  }

  return (
    <div className={`h-full ${isDark ? 'dark' : ''}`}>
      <Routes>
        {/* ===== GLOBAL ROUTER (Level A) ===== */}
        <Route path="/hub" element={
          isAuthenticated && user?.codexAccepted
            ? <HubPage />
            : <Navigate to="/auth" />
        } />

        {/* ===== AUTH ===== */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={
          isAuthenticated ? <RegisterPage /> : <Navigate to="/auth" />
        } />

        {/* ===== TAXI PRODUCT (Level B: PH-TAXI) ===== */}
        <Route path="/client" element={
          isAuthenticated && user?.codexAccepted
            ? <ClientHomePage />
            : <Navigate to="/auth" />
        } />
        <Route path="/driver" element={
          isAuthenticated && user?.role === 'DRIVER'
            ? <DriverHomePage />
            : <Navigate to="/hub" />
        } />
        <Route path="/trip/:tripId" element={
          isAuthenticated ? <TripActivePage /> : <Navigate to="/auth" />
        } />
        <Route path="/chat/:tripId" element={
          isAuthenticated ? <ChatPage /> : <Navigate to="/auth" />
        } />

        {/* ===== COMING SOON PRODUCTS (Level B: PH-REALTY, PH-AUTO, PH-TOURISM) ===== */}
        <Route path="/realty" element={
          isAuthenticated ? <ComingSoonPage /> : <Navigate to="/auth" />
        } />
        <Route path="/auto" element={
          isAuthenticated ? <ComingSoonPage /> : <Navigate to="/auth" />
        } />
        <Route path="/tourism" element={
          isAuthenticated ? <ComingSoonPage /> : <Navigate to="/auth" />
        } />

        {/* ===== VERIFICATION & ADMIN ===== */}
        <Route path="/verification" element={
          isAuthenticated && user?.role === 'DRIVER'
            ? <DriverVerificationPage />
            : <Navigate to="/hub" />
        } />
        <Route path="/admin" element={
          isAuthenticated ? <AdminPage /> : <Navigate to="/auth" />
        } />

        {/* ===== SHARED ===== */}
        <Route path="/profile" element={
          isAuthenticated ? <ProfilePage /> : <Navigate to="/auth" />
        } />
        <Route path="/history" element={
          isAuthenticated ? <HistoryPage /> : <Navigate to="/auth" />
        } />

        {/* ===== HOME (smart redirect) ===== */}
        <Route path="/" element={getHomeRoute()} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
