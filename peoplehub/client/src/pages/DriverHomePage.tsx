import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Power, PowerOff, MapPin, Clock, Navigation, Star,
  History, User, AlertCircle, X, ChevronUp, Loader2, LayoutGrid,
  ShieldCheck, MessageSquare, Banknote, ArrowRightLeft, Car,
  CalendarDays, Users, Briefcase
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import {
  driverGoOnline, driverGoOffline, updateDriverLocation, getDriverStats,
  getActiveTrip, onNearbyTrips, onDriverIncomingTrips, onIntercityTrips, createBid, TARIFFS
} from '../services/firebase';
import Button from '../components/common/Button';
import TrustBadge from '../components/common/TrustBadge';
import MapView from '../components/map/MapView';
import { getNearestCity } from '../config/cities';
import type { DriverStats, Trip } from '../types';

const NEARBY_RADIUS_KM = 25;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DriverHomePage() {
  const { user, userId, setActiveTrip } = useStore();
  const { tg } = useTelegram();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const compassRef = useRef<number>(0);
  const unsubTripsRef = useRef<(() => void) | null>(null);
  const unsubIncomingRef = useRef<(() => void) | null>(null);

  // Как только пассажир принял заказ — переходим на экран поездки
  useEffect(() => {
    if (!userId) return;
    unsubIncomingRef.current = onDriverIncomingTrips(userId, (trip) => {
      setActiveTrip(trip);
      navigate(`/trip/${trip.id}`);
    });
    return () => {
      if (unsubIncomingRef.current) {
        unsubIncomingRef.current();
        unsubIncomingRef.current = null;
      }
    };
  }, [userId, navigate]);

  // Available orders for bidding
  const [nearbyTrips, setNearbyTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [bidPrice, setBidPrice] = useState(0);
  const [bidMessage, setBidMessage] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidSent, setBidSent] = useState<Set<string>>(new Set());

  const driverGender = user?.gender;

  // Intercity
  const [driverTab, setDriverTab] = useState<'city' | 'intercity'>('city');
  const [intercityTrips, setIntercityTrips] = useState<Trip[]>([]);
  const unsubIcRef = useRef<(() => void) | null>(null);

  const filteredTrips = useMemo(() => {
    const list = nearbyTrips
      .filter((t) => !bidSent.has(t.id))
      .filter((t: any) => !t.femaleDriverOnly || driverGender === 'FEMALE');
    if (!myLocation) return list;
    return list
      .map((t) => {
        const hasCoords = t.pickupLat && t.pickupLng && t.pickupLat !== 0;
        const km = hasCoords ? haversineKm(myLocation.lat, myLocation.lng, t.pickupLat, t.pickupLng) : 0;
        return { trip: t, km };
      })
      .filter(({ km }) => km <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map(({ trip }) => trip);
  }, [nearbyTrips, myLocation, bidSent, driverGender]);

  const tripMarkersForMap = useMemo(
    () =>
      isOnline && filteredTrips.length > 0
        ? filteredTrips.map((t) => ({
            id: t.id,
            pickupLat: t.pickupLat,
            pickupLng: t.pickupLng,
            dropoffLat: t.dropoffLat,
            dropoffLng: t.dropoffLng,
          }))
        : null,
    [isOnline, filteredTrips]
  );

  function getCityFallback() {
    if (user?.cityLat && user?.cityLng && user.cityLat !== 0) {
      return { lat: user.cityLat, lng: user.cityLng };
    }
    const city = getNearestCity(51.1694, 71.4491);
    return { lat: city.lat, lng: city.lng };
  }

  // Клиент не должен видеть экран водителя — сразу на заказ
  useEffect(() => {
    if (user?.role === 'CLIENT') {
      navigate('/client', { replace: true });
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    loadStats();
    checkActiveTrip();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMyLocation(getCityFallback()),
        { enableHighAccuracy: true }
      );
    } else {
      setMyLocation(getCityFallback());
    }

    // Compass heading
    function handleOrientation(e: DeviceOrientationEvent) {
      let h: number | null = null;
      if ((e as any).webkitCompassHeading != null) h = (e as any).webkitCompassHeading;
      else if (e.alpha != null) h = (360 - e.alpha) % 360;
      if (h != null) compassRef.current = Math.round(h);
    }
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission().then((r: string) => {
        if (r === 'granted') window.addEventListener('deviceorientation', handleOrientation, true);
      }).catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (gpsWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      if (unsubTripsRef.current) unsubTripsRef.current();
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Listen for nearby trips when online
  useEffect(() => {
    if (isOnline && userId) {
      unsubTripsRef.current = onNearbyTrips(userId, (trips) => {
        setNearbyTrips(trips.filter((t: any) => !bidSent.has(t.id)) as Trip[]);
        if (trips.length > 0 && nearbyTrips.length === 0) {
          tg?.HapticFeedback?.notificationOccurred('success');
        }
      }, user?.city || "");
    } else {
      if (unsubTripsRef.current) { unsubTripsRef.current(); unsubTripsRef.current = null; }
      setNearbyTrips([]);
      setSelectedTrip(null);
    }
    return () => { if (unsubTripsRef.current) { unsubTripsRef.current(); unsubTripsRef.current = null; } };
  }, [isOnline, userId]);

  // Listen for intercity trips
  useEffect(() => {
    if (isOnline) {
      unsubIcRef.current = onIntercityTrips((trips) => {
        const filtered = trips
          .filter((t: any) => !t.femaleDriverOnly || driverGender === 'FEMALE')
          .filter((t: any) => !bidSent.has(t.id));
        setIntercityTrips(filtered as Trip[]);
      }, user?.city || "");
    } else {
      if (unsubIcRef.current) { unsubIcRef.current(); unsubIcRef.current = null; }
      setIntercityTrips([]);
    }
    return () => { if (unsubIcRef.current) { unsubIcRef.current(); unsubIcRef.current = null; } };
  }, [isOnline, driverGender]);

  async function loadStats() {
    try { const data = userId ? await getDriverStats(userId) : null; setStats(data as any); } catch {}
  }

  async function checkActiveTrip() {
    try {
      const trip = userId ? await getActiveTrip(userId) : null;
      if (trip) { setActiveTrip(trip as any); navigate(`/trip/${trip.id}`); }
    } catch {}
  }

  async function toggleOnline() {
    try {
      setLoading(true); setError('');
      if (isOnline) {
        await driverGoOffline(userId!);
        setIsOnline(false);
        if (gpsWatchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(gpsWatchIdRef.current);
          gpsWatchIdRef.current = null;
        }
        tg?.HapticFeedback?.impactOccurred('medium');
      } else {
        await driverGoOnline(userId!);
        setIsOnline(true);
        startGpsTracking();
        tg?.HapticFeedback?.notificationOccurred('success');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка');
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally { setLoading(false); }
  }

  function startGpsTracking() {
    if (!navigator.geolocation || !userId) return;
    // Одна подписка watchPosition — разрешение спрашивают один раз, не каждые 10 сек
    const THROTTLE_MS = 10000;
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        const now = Date.now();
        if (now - lastSentAtRef.current >= THROTTLE_MS) {
          lastSentAtRef.current = now;
          const heading = pos.coords.heading ?? compassRef.current;
          const speed = pos.coords.speed ? pos.coords.speed * 3.6 : undefined;
          updateDriverLocation(userId, lat, lng, heading, speed).catch(() => {});
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function openBidSheet(trip: Trip) {
    setSelectedTrip(trip);
    setBidPrice(trip.price);
    setBidMessage('');
    tg?.HapticFeedback?.impactOccurred('medium');
  }

  async function handleSubmitBid() {
    if (!selectedTrip || !userId) return;
    try {
      setBidding(true);
      await createBid(selectedTrip.id, userId, bidPrice, bidMessage);
      tg?.HapticFeedback?.notificationOccurred('success');
      setBidSent((prev) => new Set(prev).add(selectedTrip.id));
      setSelectedTrip(null);
      setNearbyTrips((prev) => prev.filter((t) => t.id !== selectedTrip.id));
    } catch (err: any) {
      tg?.showAlert?.(err.message || 'Ошибка');
    } finally { setBidding(false); }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 safe-top safe-bottom">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          className="w-full h-full"
          center={myLocation || undefined}
          driverLocation={myLocation ? { lat: myLocation.lat, lng: myLocation.lng, heading: 0 } : null}
          tripMarkers={tripMarkersForMap}
          interactive={true}
        />

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={() => navigate('/hub')} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <LayoutGrid size={20} className="text-gray-700" />
            </button>
            <button onClick={() => navigate('/profile')} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <User size={20} className="text-gray-700" />
            </button>
          </div>
          <div className="pointer-events-auto">
            <TrustBadge score={user?.trustScore ?? 4.5} size="sm" />
          </div>
          <button onClick={() => navigate('/history')} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto">
            <History size={20} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-5 safe-bottom">
        {/* Status row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isOnline && <div className="absolute inset-0 bg-green-400 rounded-full animate-ping" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {isOnline ? 'Вы на линии' : `Привет, ${user?.firstName}!`}
            </p>
            <p className="text-xs text-gray-500">
              {isOnline ? `${filteredTrips.length} запрос${filteredTrips.length === 1 ? '' : filteredTrips.length < 5 ? 'а' : 'ов'} рядом` : 'Оффлайн'}
            </p>
          </div>
          {stats && (
            <div className="text-right">
              <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-gray-900'}`}>{stats.todayEarnings.toLocaleString()} тг</p>
              <p className="text-xs text-gray-400">{stats.todayTrips} поездок</p>
            </div>
          )}
        </div>

        {/* Mode tabs */}
        {isOnline && !selectedTrip && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
            <button
              onClick={() => setDriverTab('city')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                driverTab === 'city' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              <Car size={14} /> По городу ({filteredTrips.length})
            </button>
            <button
              onClick={() => setDriverTab('intercity')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                driverTab === 'intercity' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
              }`}
            >
              <ArrowRightLeft size={14} /> Межгород ({intercityTrips.length})
            </button>
          </div>
        )}

        {/* Intercity trip list */}
        {isOnline && driverTab === 'intercity' && intercityTrips.length > 0 && !selectedTrip && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">Межгородские запросы</p>
            <div className="max-h-[40vh] min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1 -mr-1">
              {intercityTrips.map((trip: any) => {
                const scheduled = trip.scheduledAt ? new Date(trip.scheduledAt) : null;
                return (
                  <button
                    key={trip.id}
                    onClick={() => openBidSheet(trip)}
                    className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-left active:scale-[0.98] transition-transform shrink-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                        <ArrowRightLeft size={12} /> Межгород
                      </span>
                      <span className="text-base font-bold text-gray-900">{trip.pricePerSeat?.toLocaleString() || trip.price?.toLocaleString()} тг/место</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{trip.departureCity}</span>
                      <ArrowRightLeft size={12} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">{trip.destinationCity}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-1.5">
                      {scheduled && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} /> {scheduled.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} {scheduled.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {trip.fullCar ? 'Вся машина' : `${trip.seatsRequested} мест`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation size={11} /> {trip.distanceKm} км · ~{trip.estimatedHours}ч
                      </span>
                      {trip.hasBaggage && (
                        <span className="flex items-center gap-1">
                          <Briefcase size={11} /> Багаж
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trip.femaleDriverOnly && (
                        <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Только женщина
                        </span>
                      )}
                      {trip.clientNote && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 text-[10px] font-medium px-2 py-0.5 rounded-full max-w-full truncate">
                          <MessageSquare size={10} /> {trip.clientNote}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        <Banknote size={10} /> Наличные
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isOnline && driverTab === 'intercity' && intercityTrips.length === 0 && !selectedTrip && (
          <div className="text-center py-6 mb-3">
            <p className="text-3xl mb-2">🛣️</p>
            <p className="text-sm text-gray-400">Нет межгородских запросов</p>
          </div>
        )}

        {/* City trip list */}
        {isOnline && driverTab === 'city' && filteredTrips.length > 0 && !selectedTrip && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">Свайпните вниз — запросы в радиусе {NEARBY_RADIUS_KM} км</p>
            <div className="max-h-[40vh] min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1 -mr-1">
              {filteredTrips.map((trip) => {
                const distKm = myLocation
                  ? haversineKm(myLocation.lat, myLocation.lng, trip.pickupLat, trip.pickupLng).toFixed(1)
                  : trip.distanceKm?.toFixed?.(1) || '?';
                return (
                  <button
                    key={trip.id}
                    onClick={() => openBidSheet(trip)}
                    className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-left active:scale-[0.98] transition-transform shrink-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-semibold">Новый запрос</span>
                      <span className="text-base font-bold text-gray-900">{trip.price.toLocaleString()} тг</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 mt-1 rounded-full bg-green-500 shrink-0" />
                        <p className="text-xs text-gray-600 truncate">{trip.pickupAddress}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 mt-1 rounded-full bg-red-500 shrink-0" />
                        <p className="text-xs text-gray-600 truncate">{trip.dropoffAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>до точки А: {distKm} км</span>
                      <span>маршрут: {trip.distanceKm?.toFixed?.(1) || '?'} км</span>
                      <span>~{trip.estimatedMinutes || '?'} мин</span>
                    </div>
                    {/* Preferences badges */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(trip as any).femaleDriverOnly && (
                        <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Только женщина
                        </span>
                      )}
                      {(trip as any).clientNote && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 text-[10px] font-medium px-2 py-0.5 rounded-full max-w-full truncate">
                          <MessageSquare size={10} /> {(trip as any).clientNote}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        <Banknote size={10} /> Наличные
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 mb-3 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!isOnline && (
          <div className="bg-green-50 rounded-xl px-4 py-2 mb-3 text-center">
            <p className="text-green-700 font-semibold text-sm">0% комиссии — вся оплата ваша</p>
          </div>
        )}

        {/* Go online / offline */}
        <button
          onClick={toggleOnline}
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all ${
            isOnline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isOnline ? (
            <><PowerOff size={20} /> Уйти с линии</>
          ) : (
            <><Power size={20} /> Выйти на линию</>
          )}
        </button>
      </div>

      {/* ===== BID POPUP (overlay) ===== */}
      {selectedTrip && (
        <div className="absolute inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTrip(null)} />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-6 safe-bottom animate-slide-up">
            {/* Close */}
            <button onClick={() => setSelectedTrip(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <X size={18} className="text-gray-500" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {(selectedTrip as any).tripType === 'INTERCITY' ? 'Откликнуться на межгород' : 'Откликнуться'}
            </h3>

            {/* Route */}
            <div className="space-y-2 mb-4">
              {(selectedTrip as any).tripType === 'INTERCITY' ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{(selectedTrip as any).departureCity}</span>
                    <ArrowRightLeft size={14} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-gray-900">{(selectedTrip as any).destinationCity}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {(selectedTrip as any).scheduledAt && (
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {new Date((selectedTrip as any).scheduledAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}{' '}
                        {new Date((selectedTrip as any).scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span><Users size={12} className="inline" /> {(selectedTrip as any).fullCar ? 'Вся машина' : `${(selectedTrip as any).seatsRequested} мест`}</span>
                    <span>{selectedTrip.distanceKm} км · ~{(selectedTrip as any).estimatedHours}ч</span>
                    {(selectedTrip as any).hasBaggage && <span><Briefcase size={12} className="inline" /> Багаж</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Клиент: {((selectedTrip as any).pricePerSeat || selectedTrip.price).toLocaleString()} тг/место</p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 mt-1 rounded-full bg-green-500 ring-2 ring-green-200 shrink-0" />
                    <p className="text-sm text-gray-700">{selectedTrip.pickupAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 mt-1 rounded-full bg-red-500 ring-2 ring-red-200 shrink-0" />
                    <p className="text-sm text-gray-700">{selectedTrip.dropoffAddress}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 ml-4">
                    <span>{selectedTrip.distanceKm?.toFixed?.(1) || '?'} км</span>
                    <span>~{selectedTrip.estimatedMinutes || '?'} мин</span>
                    <span className="text-gray-400">Клиент: {selectedTrip.price.toLocaleString()} тг</span>
                  </div>
                </>
              )}
              {/* Client preferences in bid popup */}
              <div className="flex flex-wrap gap-1.5 ml-4 mt-2">
                {(selectedTrip as any).femaleDriverOnly && (
                  <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-xs font-medium px-2.5 py-1 rounded-full">
                    <ShieldCheck size={12} /> Только женщина
                  </span>
                )}
                {(selectedTrip as any).clientNote && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg max-w-full">
                    <MessageSquare size={12} className="shrink-0" /> {(selectedTrip as any).clientNote}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Banknote size={12} /> Наличные
                </span>
              </div>
            </div>

            {/* Price selector */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Ваша цена</p>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => { setBidPrice((p) => Math.max(650, p - 100)); tg?.HapticFeedback?.impactOccurred('light'); }}
                  className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center active:scale-95"
                >
                  -100
                </button>
                <button
                  onClick={() => { setBidPrice((p) => Math.max(650, p - 50)); tg?.HapticFeedback?.impactOccurred('light'); }}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  -50
                </button>
                <span className="text-3xl font-bold text-gray-900 mx-2">
                  {bidPrice.toLocaleString()} <span className="text-base text-gray-400">тг</span>
                </span>
                <button
                  onClick={() => { setBidPrice((p) => p + 50); tg?.HapticFeedback?.impactOccurred('light'); }}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +50
                </button>
                <button
                  onClick={() => { setBidPrice((p) => p + 100); tg?.HapticFeedback?.impactOccurred('light'); }}
                  className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center active:scale-95"
                >
                  +100
                </button>
              </div>
              {bidPrice < selectedTrip.price && (
                <p className="text-xs text-green-600 mt-2 text-center">
                  На {(selectedTrip.price - bidPrice).toLocaleString()} тг дешевле клиента
                </p>
              )}
              {bidPrice > selectedTrip.price && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  На {(bidPrice - selectedTrip.price).toLocaleString()} тг дороже клиента
                </p>
              )}
            </div>

            {/* Message */}
            <input
              type="text"
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
              placeholder="Сообщение клиенту (необязательно)"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none mb-4"
              maxLength={60}
            />

            {/* Submit */}
            <Button fullWidth size="lg" loading={bidding} onClick={handleSubmitBid}>
              Откликнуться · {bidPrice.toLocaleString()} тг
            </Button>
            <p className="text-[10px] text-gray-400 text-center mt-2">Платформа предоставляет информационные услуги. Договор перевозки заключается напрямую между сторонами.</p>
          </div>
        </div>
      )}
    </div>
  );
}
