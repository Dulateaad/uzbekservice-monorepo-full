import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageCircle, Star, Loader2, Phone, Navigation, Clock,
  MapPin, Check, X, ArrowLeft, ChevronUp
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { getDirections } from '../services/geo';
import {
  onTripUpdate, onDriverLocation, getTripByIdEnriched, enrichTripWithUsers, updateTripStatus,
  rateTrip, onTripBids, acceptBid, updateTripPrice, declineAssignedDriver,
} from '../services/firebase';
import Button from '../components/common/Button';
import TrustBadge from '../components/common/TrustBadge';
import MapView from '../components/map/MapView';
import type { Trip, TripStatus, Bid } from '../types';

const STATUS_UI: Record<string, {
  label: string; color: string; bg: string; pulse?: boolean; description: string;
}> = {
  SEARCHING: { label: 'Поиск', color: 'bg-yellow-500', bg: 'bg-yellow-50', pulse: true, description: 'Ожидаем отклики...' },
  BIDDING:   { label: 'Отклики', color: 'bg-blue-500', bg: 'bg-blue-50', pulse: true, description: 'Водители откликаются на запрос' },
  DRIVER_ASSIGNED: { label: 'Вы договорились', color: 'bg-green-500', bg: 'bg-green-50', description: 'Вы выбрали водителя' },
  DRIVER_ARRIVING: { label: 'Едет к вам', color: 'bg-blue-500', bg: 'bg-blue-50', pulse: true, description: 'Водитель в пути' },
  DRIVER_ARRIVED:  { label: 'На месте', color: 'bg-green-500', bg: 'bg-green-50', description: 'Водитель ожидает вас' },
  IN_PROGRESS:     { label: 'В пути', color: 'bg-indigo-500', bg: 'bg-indigo-50', pulse: true, description: 'Вы в пути к месту назначения' },
  COMPLETED:       { label: 'Завершена', color: 'bg-green-600', bg: 'bg-green-50', description: 'Поездка завершена' },
  CANCELLED:       { label: 'Отменена', color: 'bg-red-500', bg: 'bg-red-50', description: 'Поездка отменена' },
  NO_DRIVER:       { label: 'Нет откликов', color: 'bg-gray-500', bg: 'bg-gray-50', description: 'Никто не откликнулся' },
};

const VEHICLE_PHOTO_ORDER = ['front', 'rear', 'left', 'right', 'interiorFront', 'interiorRear', 'trunk'] as const;
const VEHICLE_PHOTO_LABELS: Record<string, string> = {
  front: 'Спереди',
  rear: 'Сзади',
  left: 'Слева',
  right: 'Справа',
  interiorFront: 'Салон спереди',
  interiorRear: 'Салон сзади',
  trunk: 'Багажник',
};

function DriverVehiclePhotoStrip({ urls }: { urls: Record<string, string> | undefined }) {
  if (!urls || typeof urls !== 'object') return null;
  const entries = VEHICLE_PHOTO_ORDER.filter((k) => urls[k]).map((k) => ({ key: k, url: urls[k] }));
  if (!entries.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Фото авто (верификация)</p>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {entries.map(({ key, url }) => (
          <a key={key} href={url} target="_blank" rel="noreferrer" className="shrink-0 block">
            <img src={url} alt={VEHICLE_PHOTO_LABELS[key] || key} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
            <span className="text-[9px] text-gray-400 block text-center mt-0.5 max-w-[64px] truncate">{VEHICLE_PHOTO_LABELS[key]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function playBidSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function TripActivePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, userId, setActiveTrip, driverLocation, setDriverLocation } = useStore();
  const { tg } = useTelegram();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);

  // Auction
  const [bids, setBids] = useState<Bid[]>([]);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  // Rating
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingTags, setRatingTags] = useState<string[]>([]);

  // Sheet
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // ETA timers: minutes until driver at pickup, or until at destination
  const [etaToPickup, setEtaToPickup] = useState<number | null>(null);
  const [etaToDestination, setEtaToDestination] = useState<number | null>(null);
  const etaUpdateRef = useRef<number>(0);

  // Search timeout (client-side: 15 minutes)
  const [searchElapsed, setSearchElapsed] = useState(0);

  /** Был назначенным водителем по этой поездке — чтобы отловить снятие назначения клиентом */
  const wasMyAssignmentRef = useRef(false);

  const isDriver = user?.role === 'DRIVER';
  const isClient = user?.role === 'CLIENT';

  useEffect(() => {
    wasMyAssignmentRef.current = false;
  }, [tripId]);

  useEffect(() => {
    if (!trip || !userId) return;
    if (
      trip.driverId === userId &&
      ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(trip.status)
    ) {
      wasMyAssignmentRef.current = true;
    }
  }, [trip?.driverId, trip?.status, userId]);

  useEffect(() => {
    loadTrip();
  }, [tripId, userId]);

  const SEARCH_TIMEOUT_SEC = 15 * 60; // 15 minutes

  // Client-side search timer: count elapsed seconds while SEARCHING/BIDDING
  useEffect(() => {
    if (!trip || !['SEARCHING', 'BIDDING'].includes(trip.status)) {
      setSearchElapsed(0);
      return;
    }
    const raw = trip.createdAt as any;
    const start: Date = raw?.toDate ? raw.toDate() : typeof raw === 'string' ? new Date(raw) : new Date();
    setSearchElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
      setSearchElapsed(elapsed);
      if (elapsed >= SEARCH_TIMEOUT_SEC && tripId && userId) {
        clearInterval(timer);
        updateTripStatus(tripId, 'NO_DRIVER', userId).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [trip?.status, trip?.createdAt]);

  useEffect(() => {
    if (!tripId) return;
    const unsub = onTripUpdate(tripId, (data) => {
      enrichTripWithUsers(data).then((enriched) => {
        const st = useStore.getState();
        const uid = st.userId;
        const role = st.user?.role;
        if (
          role === 'DRIVER' &&
          uid &&
          wasMyAssignmentRef.current &&
          enriched.status === 'BIDDING' &&
          !enriched.driverId
        ) {
          wasMyAssignmentRef.current = false;
          st.setActiveTrip(null);
          tg?.showAlert?.('Клиент отказался от заказа с вами или выбрал другого водителя.');
          navigate('/driver');
          return;
        }
        setTrip(enriched);
        setActiveTrip(enriched);
      });
      tg?.HapticFeedback?.impactOccurred('light');
      if (data?.status === 'DRIVER_ARRIVING' || data?.status === 'IN_PROGRESS') etaUpdateRef.current = 0;
    });
    return () => unsub();
  }, [tripId, navigate, tg]);

  const prevBidCountRef = useRef(0);

  // Listen for bids (auction)
  useEffect(() => {
    if (!tripId || !trip) return;
    if (!['SEARCHING', 'BIDDING'].includes(trip.status)) return;
    const unsub = onTripBids(tripId, (data) => {
      const newCount = data.length;
      const hadFewer = newCount > prevBidCountRef.current;
      prevBidCountRef.current = newCount;
      setBids(data as Bid[]);
      if (hadFewer && newCount > 0) {
        tg?.HapticFeedback?.notificationOccurred('success');
        playBidSound();
      }
    });
    return () => unsub();
  }, [tripId, trip?.status]);

  useEffect(() => {
    if (!trip?.driverId) return;
    const unsub = onDriverLocation(trip.driverId, (loc) => setDriverLocation(loc));
    return () => unsub();
  }, [trip?.driverId]);

  useEffect(() => {
    if (trip) loadRoute(trip);
  }, [trip?.id]);

  // Во время поездки (IN_PROGRESS) обновляем маршрут от водителя до точки Б — линия на карте следует за машиной
  useEffect(() => {
    if (!trip || trip.status !== 'IN_PROGRESS' || !driverLocation) return;
    getDirections(driverLocation.lat, driverLocation.lng, trip.dropoffLat, trip.dropoffLng)
      .then((r) => { if (r?.geometry) setRouteGeometry(r.geometry); })
      .catch(() => {});
  }, [trip?.status, trip?.dropoffLat, trip?.dropoffLng, driverLocation?.lat, driverLocation?.lng]);

  // ETA: driver → pickup (when DRIVER_ARRIVING) or driver → dropoff (when IN_PROGRESS)
  useEffect(() => {
    if (!trip || !driverLocation) {
      setEtaToPickup(null);
      setEtaToDestination(null);
      return;
    }
    const now = Date.now();
    if (now - etaUpdateRef.current < 20000) return; // throttle 20s
    etaUpdateRef.current = now;

    if (trip.status === 'DRIVER_ARRIVING') {
      getDirections(driverLocation.lat, driverLocation.lng, trip.pickupLat, trip.pickupLng)
        .then((r) => { if (r) setEtaToPickup(r.durationMinutes); setEtaToDestination(null); })
        .catch(() => {});
    } else if (trip.status === 'IN_PROGRESS') {
      getDirections(driverLocation.lat, driverLocation.lng, trip.dropoffLat, trip.dropoffLng)
        .then((r) => { if (r) setEtaToDestination(r.durationMinutes); setEtaToPickup(null); })
        .catch(() => {});
    } else {
      setEtaToPickup(null);
      setEtaToDestination(null);
    }
  }, [trip?.status, trip?.pickupLat, trip?.pickupLng, trip?.dropoffLat, trip?.dropoffLng, driverLocation?.lat, driverLocation?.lng]);


  async function loadTrip() {
    try {
      setLoading(true);
      if (!tripId || !userId) return;
      const data = await getTripByIdEnriched(tripId);
      if (data && (data.clientId === userId || data.driverId === userId)) {
        setTrip(data as any);
        setActiveTrip(data as any);
      }
    } finally { setLoading(false); }
  }

  async function loadRoute(t: Trip) {
    const directions = await getDirections(t.pickupLat, t.pickupLng, t.dropoffLat, t.dropoffLng);
    if (directions) setRouteGeometry(directions.geometry);
  }

  async function handleAcceptBid(bidId: string) {
    if (!tripId || !userId) return;
    try {
      setAcceptingBid(bidId);
      const updated = await acceptBid(tripId, bidId, userId);
      setTrip(updated as any);
      setActiveTrip(updated as any);
      tg?.HapticFeedback?.notificationOccurred('success');
    } catch (err: any) {
      tg?.showAlert?.(err.message || 'Ошибка');
    } finally {
      setAcceptingBid(null);
    }
  }

  function handleDeclineDriver() {
    if (!tripId || !userId) return;
    const confirmText = 'Отказаться от этого водителя и снова выбрать из откликов?';
    const run = async () => {
      try {
        setActionLoading(true);
        const updated = await declineAssignedDriver(tripId, userId);
        setTrip(updated as any);
        setActiveTrip(updated as any);
        prevBidCountRef.current = 0;
        tg?.HapticFeedback?.notificationOccurred('success');
      } catch (err: any) {
        tg?.showAlert?.(err.message || 'Ошибка');
      } finally {
        setActionLoading(false);
      }
    };
    if (tg?.showConfirm) tg.showConfirm(confirmText, (ok) => { if (ok) void run(); });
    else if (window.confirm(confirmText)) void run();
  }

  async function updateStatus(newStatus: string) {
    if (!trip) return;
    try {
      setActionLoading(true);
      const updated = await updateTripStatus(trip.id, newStatus, userId!);
      setTrip(updated as any);
      setActiveTrip(updated as any);
      tg?.HapticFeedback?.notificationOccurred('success');
    } catch (err: any) {
      tg?.showAlert?.(err.message || 'Ошибка');
    } finally { setActionLoading(false); }
  }

  async function handleCancel() {
    tg?.showConfirm?.('Отменить поездку?', async (ok) => {
      if (ok) {
        await updateStatus('CANCELLED');
        setActiveTrip(null);
        navigate(isDriver ? '/driver' : '/client');
      }
    });
  }

  async function handleRate() {
    if (!trip || rating === 0) return;
    try {
      const tagStr = ratingTags.length ? ratingTags.join(', ') + '. ' : '';
      await rateTrip(trip.id, userId!, rating, tagStr + ratingComment);
      tg?.HapticFeedback?.notificationOccurred('success');
      setActiveTrip(null);
      navigate(isDriver ? '/driver' : '/client');
    } catch {}
  }

  const goHome = () => {
    setActiveTrip(null);
    navigate(isDriver ? '/driver' : '/client');
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
        <p className="text-sm text-gray-400">Загружаем поездку...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 bg-gray-50">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-gray-500 mb-4">Поездка не найдена</p>
        <Button onClick={goHome}>На главную</Button>
      </div>
    );
  }

  const st = STATUS_UI[trip.status] || STATUS_UI.SEARCHING;
  const displayPrice = trip.finalPrice ?? trip.price ?? 0;
  const distanceKm = trip.distanceKm ?? 0;

  // ==================== COMPLETED → RATING SCREEN ====================
  if (trip.status === 'COMPLETED') {
    const RATING_TAGS = isClient
      ? ['Вежливый', 'Быстро', 'Чистая машина', 'Хорошая музыка', 'Знает город']
      : ['Вежливый', 'Вовремя вышел', 'Приятный пассажир'];

    return (
      <div className="h-full w-full relative overflow-hidden">
        <div className="absolute inset-0">
          <MapView
            className="w-full h-full"
            pickupLocation={{ lat: trip.pickupLat, lng: trip.pickupLng }}
            dropoffLocation={{ lat: trip.dropoffLat, lng: trip.dropoffLng }}
            routeGeometry={routeGeometry}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 safe-bottom">
          <div className="text-center mb-5">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">Поездка завершена!</h2>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
              <span>{(typeof distanceKm === 'number' ? distanceKm : 0).toFixed(1)} км</span>
              <span>·</span>
              <span className="text-xl font-bold text-gray-900">{Number(displayPrice).toLocaleString()} тг</span>
            </div>
            {isClient && (
              <p className="text-xs text-gray-400 mt-1">Оплата водителю: наличные или перевод</p>
            )}
          </div>

          <p className="text-sm text-gray-600 font-medium mb-3 text-center">
            {isClient ? 'Оставьте отзыв о водителе' : 'Оставьте отзыв о пассажире'}
          </p>

          {/* Stars */}
          <div className="flex justify-center gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => { setRating(s); tg?.HapticFeedback?.selectionChanged(); }}
                className="transition-all active:scale-75"
              >
                <Star
                  size={40}
                  className={`transition-colors ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                />
              </button>
            ))}
          </div>

          {/* Tags */}
          {rating > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4 animate-fade-in">
              {RATING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setRatingTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    );
                    tg?.HapticFeedback?.selectionChanged();
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    ratingTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {rating > 0 && (
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Комментарий (необязательно)"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none resize-none h-14 mb-4 animate-fade-in"
            />
          )}

          <div className="space-y-2">
            <Button fullWidth size="lg" onClick={handleRate} disabled={rating === 0}>
              {rating > 0 ? 'Отправить отзыв' : 'Выберите оценку'}
            </Button>
            <button onClick={goHome} className="w-full text-center text-sm text-gray-400 py-2">
              Пропустить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN TRIP VIEW ====================
  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView
          className="w-full h-full"
          pickupLocation={{ lat: trip.pickupLat, lng: trip.pickupLng }}
          dropoffLocation={{ lat: trip.dropoffLat, lng: trip.dropoffLng }}
          driverLocation={driverLocation}
          routeGeometry={routeGeometry}
          searchingForDriver={trip.status === 'SEARCHING'}
          interactive={true}
        />
      </div>

      {/* Back button */}
      <div className="absolute top-4 left-4 safe-top z-20">
        <button
          onClick={goHome}
          className="w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Status pill (floating) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 safe-top z-20">
        <div className={`${st.bg} backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2`}>
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
            {st.pulse && <div className={`absolute inset-0 ${st.color} rounded-full animate-ping opacity-40`} />}
          </div>
          <span className="text-sm font-semibold text-gray-800">{st.label}</span>
          {bids.length > 0 && ['SEARCHING', 'BIDDING'].includes(trip.status) && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {bids.length}
            </span>
          )}
        </div>
      </div>

      {/* ===== BOTTOM SHEET ===== */}
      <div className={`absolute left-0 right-0 bottom-0 z-30 transition-all duration-300 ease-out safe-bottom ${
        sheetExpanded ? 'h-[85vh]' : ['SEARCHING', 'BIDDING'].includes(trip.status) && bids.length > 0 ? 'h-[65vh]' : 'h-[35vh]'
      }`}>
        <div className="h-full bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Drag handle */}
          <button
            className="flex-shrink-0 pt-3 pb-1 w-full touch-manipulation"
            onClick={() => setSheetExpanded(!sheetExpanded)}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
          </button>

          {/* Scrollable content — min-h-0 нужен для прокрутки во flex */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-auto px-5 pb-6">

            {/* ===== SEARCHING / BIDDING: Show bids ===== */}
            {['SEARCHING', 'BIDDING'].includes(trip.status) && (
              <>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {bids.length === 0 ? 'Ищем водителей...' : `${bids.length} отклик${bids.length === 1 ? '' : bids.length < 5 ? 'а' : 'ов'}`}
                    </p>
                  </div>

                  {/* Live price adjustment */}
                  {isClient && (
                    <div className="bg-blue-50 rounded-xl p-3 mb-2">
                      <p className="text-[10px] text-gray-500 text-center mb-1.5">Ваша цена (можно менять)</p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            const np = Math.max(650, (trip.price ?? 0) - 100);
                            updateTripPrice(tripId!, np, userId!).then(() => { setTrip((t: any) => t ? { ...t, price: np } : t); }).catch(() => {});
                            tg?.HapticFeedback?.impactOccurred('light');
                          }}
                          className="w-12 h-11 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center active:scale-95"
                        >-100</button>
                        <div className="px-3 min-w-[5.5rem]">
                          <p className="text-xl font-extrabold text-blue-600 text-center">{(trip.price ?? 0).toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400 text-center">тенге</p>
                        </div>
                        <button
                          onClick={() => {
                            const np = (trip.price ?? 0) + 100;
                            updateTripPrice(tripId!, np, userId!).then(() => { setTrip((t: any) => t ? { ...t, price: np } : t); }).catch(() => {});
                            tg?.HapticFeedback?.impactOccurred('light');
                          }}
                          className="w-12 h-11 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center active:scale-95"
                        >+100</button>
                      </div>
                    </div>
                  )}
                  {bids.length > 2 && (
                    <p className="text-xs text-gray-400 mb-2">Свайпните вниз, чтобы увидеть все</p>
                  )}
                  {bids.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                      <span className="text-sm text-gray-400">Водители видят ваш запрос</span>
                      {searchElapsed > 0 && (
                        <span className="text-xs text-gray-400">
                          {(() => {
                            const remaining = Math.max(0, SEARCH_TIMEOUT_SEC - searchElapsed);
                            const m = Math.floor(remaining / 60);
                            const s = remaining % 60;
                            return `осталось ${m}:${String(s).padStart(2, '0')}`;
                          })()}
                        </span>
                      )}
                      {searchElapsed > 7 * 60 && (
                        <p className="text-xs text-amber-600 mt-1 text-center px-4">
                          Повысьте цену, чтобы привлечь водителей, или отмените поиск.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {bids.length > 0 && (
                  <p className="text-[10px] text-gray-400 mb-2">Выбирая водителя, вы заключаете договор напрямую с ним. Платформа — информационный посредник.</p>
                )}

                {/* Bid cards */}
                <div className="space-y-2 mb-3">
                  {bids.map((bid) => (
                    <div key={bid.id} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-blue-100 shrink-0 flex items-center justify-center">
                          {bid.driver?.avatarUrl ? (
                            <img src={bid.driver.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-blue-600">{bid.driver?.firstName?.[0] || '🚗'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {bid.driver?.firstName} {bid.driver?.lastName || ''}
                            </p>
                            {bid.driver?.trustScore != null && (
                              <TrustBadge score={typeof bid.driver.trustScore === 'object' ? bid.driver.trustScore.score : bid.driver.trustScore} size="sm" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {[bid.driver?.driverProfile?.carColor, bid.driver?.driverProfile?.carBrand, bid.driver?.driverProfile?.carModel, bid.driver?.driverProfile?.carYear && `(${bid.driver.driverProfile.carYear})`].filter(Boolean).join(' ')}
                            {bid.driver?.driverProfile?.licensePlate ? ` · ${bid.driver.driverProfile.licensePlate}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gray-900">{bid.price.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">тг</p>
                        </div>
                      </div>

                      {/* ETA + message */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> ~{bid.etaMinutes} мин
                        </span>
                        {bid.message && <span className="truncate">«{bid.message}»</span>}
                      </div>

                      {isClient && (trip as any).tripType === 'INTERCITY' && (
                        <DriverVehiclePhotoStrip urls={(bid.driver?.driverProfile as any)?.vehiclePhotoUrls} />
                      )}

                      {/* Accept button */}
                      <button
                        onClick={() => handleAcceptBid(bid.id)}
                        disabled={!!acceptingBid}
                        className="w-full mt-2.5 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 transition-all"
                      >
                        {acceptingBid === bid.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            Договориться · {bid.price.toLocaleString()} тг
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== ASSIGNED / ARRIVING / ARRIVED / IN_PROGRESS ===== */}
            {!['SEARCHING', 'BIDDING', 'COMPLETED', 'CANCELLED', 'NO_DRIVER'].includes(trip.status) && (
              <>
                {/* ETA timers */}
                {trip.status === 'DRIVER_ARRIVING' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {isClient ? 'Водитель будет через' : 'До пассажира'}
                    </span>
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      <Clock size={16} /> ~{etaToPickup ?? '…'} мин
                    </span>
                  </div>
                )}
                {trip.status === 'IN_PROGRESS' && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
                    <span className="text-sm text-indigo-800">До точки назначения</span>
                    <span className="font-bold text-indigo-600 flex items-center gap-1">
                      <Clock size={16} /> ~{etaToDestination ?? trip.estimatedMinutes ?? '…'} мин
                    </span>
                  </div>
                )}

                {/* Status */}
                <div className={`${st.bg} rounded-xl px-4 py-2.5 mb-3`}>
                  <p className="text-sm font-semibold text-gray-800">{st.description}</p>
                </div>

                {/* Driver card (for passenger): photo, name, rating, car, plate */}
                {trip.driver && isClient && (
                  <div className="bg-gray-50 rounded-2xl p-3 mb-3 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-100 shrink-0 flex items-center justify-center">
                        {trip.driver.avatarUrl ? (
                          <img src={trip.driver.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-blue-600">
                            {trip.driver.firstName?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{trip.driver.firstName} {trip.driver.lastName || ''}</p>
                          {trip.driver.trustScore != null && (
                            <TrustBadge score={typeof trip.driver.trustScore === 'object' ? trip.driver.trustScore.score : trip.driver.trustScore} size="sm" />
                          )}
                        </div>
                        {trip.driver.driverProfile && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[trip.driver.driverProfile.carColor, trip.driver.driverProfile.carBrand, trip.driver.driverProfile.carModel, trip.driver.driverProfile.carYear && `(${trip.driver.driverProfile.carYear})`].filter(Boolean).join(' ')}
                            {trip.driver.driverProfile.licensePlate && ` · ${trip.driver.driverProfile.licensePlate}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/chat/${trip.id}`)}
                        className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0"
                        aria-label="Чат"
                      >
                        <MessageCircle size={18} className="text-white" />
                      </button>
                    </div>
                    {(trip as any).tripType === 'INTERCITY' && (
                      <DriverVehiclePhotoStrip urls={(trip.driver.driverProfile as any)?.vehiclePhotoUrls} />
                    )}
                  </div>
                )}

                {/* Client card (for driver) */}
                {trip.client && isDriver && (
                  <div className="bg-gray-50 rounded-2xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">👤</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{trip.client.firstName}</p>
                        {trip.client.phone && <p className="text-xs text-gray-500">{trip.client.phone}</p>}
                      </div>
                      <button
                        onClick={() => navigate(`/chat/${trip.id}`)}
                        className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <MessageCircle size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Route details */}
                {(trip as any).tripType === 'INTERCITY' ? (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2 mb-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Межгород</span>
                      <span className="text-sm font-bold text-gray-900">{(trip as any).departureCity} → {(trip as any).destinationCity}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2 px-1">
                      {(trip as any).scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-indigo-500" />
                          {new Date((trip as any).scheduledAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}{' '}
                          {new Date((trip as any).scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span>{(trip as any).fullCar ? 'Вся машина' : `${(trip as any).seatsRequested || 1} мест`}</span>
                      {(trip as any).hasBaggage && <span>🧳 Багаж</span>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-green-500 ring-2 ring-green-200 shrink-0" />
                      <p className="text-xs text-gray-700">{trip.pickupAddress}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-red-500 ring-2 ring-red-200 shrink-0" />
                      <p className="text-xs text-gray-700">{trip.dropoffAddress}</p>
                    </div>
                  </div>
                )}

                {/* Trip stats */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Navigation size={12} /> {(trip.distanceKm ?? 0).toFixed(1)} км</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {(trip as any).tripType === 'INTERCITY' && (trip as any).estimatedHours
                        ? `~${(trip as any).estimatedHours} ч`
                        : `~${trip.estimatedMinutes} мин`
                      }
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">{displayPrice.toLocaleString()} тг</span>
                </div>

                {/* Payment: cash-only MVP */}
                {['DRIVER_ARRIVED', 'IN_PROGRESS'].includes(trip.status) && isClient && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">Оплата водителю напрямую</p>
                    <p className="text-xs text-amber-700">Наличные или перевод (Kaspi/карта) — договоритесь с водителем</p>
                  </div>
                )}
              </>
            )}

            {/* NO_DRIVER / CANCELLED */}
            {['CANCELLED', 'NO_DRIVER'].includes(trip.status) && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">{trip.status === 'CANCELLED' ? '❌' : '😔'}</div>
                <p className="text-gray-500 mb-1">{st.description}</p>
              </div>
            )}
          </div>

          {/* ===== STICKY ACTIONS ===== */}
          <div className="flex-shrink-0 px-5 pb-5 safe-bottom bg-white border-t border-gray-100 pt-3 space-y-2">
            {isClient && trip.status === 'DRIVER_ASSIGNED' && (
              <button
                type="button"
                onClick={handleDeclineDriver}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold active:scale-[0.98] disabled:opacity-50"
              >
                Выбрать другого водителя
              </button>
            )}
            {/* Driver actions */}
            {isDriver && trip.status === 'DRIVER_ASSIGNED' && (
              <Button fullWidth size="lg" loading={actionLoading} onClick={() => updateStatus('DRIVER_ARRIVING')}>
                Еду к клиенту
              </Button>
            )}
            {isDriver && trip.status === 'DRIVER_ARRIVING' && (
              <Button fullWidth size="lg" loading={actionLoading} onClick={() => updateStatus('DRIVER_ARRIVED')}>
                Я на месте
              </Button>
            )}
            {isDriver && trip.status === 'DRIVER_ARRIVED' && (
              <Button fullWidth size="lg" loading={actionLoading} onClick={() => updateStatus('IN_PROGRESS')}>
                Начать поездку
              </Button>
            )}
            {isDriver && trip.status === 'IN_PROGRESS' && (
              <Button fullWidth size="lg" loading={actionLoading} onClick={() => updateStatus('COMPLETED')}>
                Отметить как выполнено
              </Button>
            )}

            {/* Cancel */}
            {!['COMPLETED', 'CANCELLED', 'NO_DRIVER'].includes(trip.status) && (
              <button onClick={handleCancel} className="w-full text-center text-sm text-red-400 py-2 font-medium">
                Отменить
              </button>
            )}

            {/* Go home */}
            {['CANCELLED', 'NO_DRIVER'].includes(trip.status) && (
              <Button fullWidth size="lg" onClick={() => { setActiveTrip(null); goHome(); }}>
                На главную
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
