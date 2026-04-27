import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Navigation, Clock, History, User, X, Loader2, MapPin,
  ChevronDown, ChevronUp, Car, Zap, Crown, Search, LayoutGrid, ShieldCheck, MessageSquare, Banknote,
  ArrowRightLeft, CalendarDays, Users, Briefcase, ChevronRight, Minus, Plus, Info
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { getActiveTrip, createTrip, createIntercityTrip, calculateTripPrice, TARIFFS as TARIFF_LIST, getAllTariffPrices, type TariffId } from '../services/firebase';
import { getDirections, geocodeForward, geocodeReverse, type GeocodingResult } from '../services/geo';
import { CITIES } from '../config/cities';
import { getNearestCity } from '../config/cities';
import { findRoute, getRecommendedPrice, getRouteInfo, getPopularRoutesFrom } from '../config/intercityRoutes';
import Button from '../components/common/Button';
import TrustBadge from '../components/common/TrustBadge';
import MapView from '../components/map/MapView';
import type { PriceEstimate } from '../types';

interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
}


type UIState = 'map' | 'search' | 'tariffs';
type TripMode = 'city' | 'intercity';

export default function ClientHomePage() {
  const { user, userId, setActiveTrip } = useStore();
  const { tg } = useTelegram();
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);

  const [tripMode, setTripMode] = useState<TripMode>('city');
  const [uiState, setUiState] = useState<UIState>('map');
  const [searchField, setSearchField] = useState<'pickup' | 'dropoff'>('dropoff');

  // Location
  const [pickup, setPickup] = useState<LocationPoint>({ address: '', lat: 0, lng: 0 });
  const [dropoff, setDropoff] = useState<LocationPoint>({ address: '', lat: 0, lng: 0 });
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);
  const headingRef = useRef<number>(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Route & pricing
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Tariff selection
  const [selectedTariff, setSelectedTariff] = useState<TariffId>('econom');
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [tariffPrices, setTariffPrices] = useState<ReturnType<typeof getAllTariffPrices>>([]);

  // Order
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');

  // Price breakdown
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Preferences
  const [femaleDriverOnly, setFemaleDriverOnly] = useState(false);
  const [clientNote, setClientNote] = useState('');

  // ===== INTERCITY STATE =====
  const [icFrom, setIcFrom] = useState('');
  const [icTo, setIcTo] = useState('');
  const [icDate, setIcDate] = useState('');
  const [icTime, setIcTime] = useState('');
  const [icSeats, setIcSeats] = useState(1);
  const [icFullCar, setIcFullCar] = useState(false);
  const [icBaggage, setIcBaggage] = useState(false);
  const [icPricePerSeat, setIcPricePerSeat] = useState(0);
  const [icFemaleOnly, setIcFemaleOnly] = useState(false);
  const [icNote, setIcNote] = useState('');
  const [icSelectingField, setIcSelectingField] = useState<'from' | 'to' | null>(null);
  const [icCitySearch, setIcCitySearch] = useState('');
  const [icOrdering, setIcOrdering] = useState(false);

  // Bottom sheet drag
  const [sheetHeight, setSheetHeight] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Recent addresses (from localStorage)
  const [recentAddresses, setRecentAddresses] = useState<LocationPoint[]>([]);

  // Водитель не должен видеть интерфейс заказа — сразу на экран водителя
  useEffect(() => {
    if (user?.role === 'DRIVER') {
      navigate('/driver', { replace: true });
    }
  }, [user?.role, navigate]);

  // Load recent addresses
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ph_recent_addresses');
      if (saved) setRecentAddresses(JSON.parse(saved));
    } catch {}
  }, []);

  function saveRecentAddress(point: LocationPoint) {
    if (!point.address || !point.lat) return;
    const updated = [point, ...recentAddresses.filter((a) => a.address !== point.address)].slice(0, 5);
    setRecentAddresses(updated);
    localStorage.setItem('ph_recent_addresses', JSON.stringify(updated));
  }

  // После поездки (/trip/...) корректировка цены оставалась в памяти — сбрасываем на новый заказ
  useEffect(() => {
    const prev = prevPathRef.current;
    if (location.pathname === '/client' && prev.startsWith('/trip')) {
      setPriceAdjustment(0);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Check active trip
  useEffect(() => {
    if (!userId) return;
    getActiveTrip(userId).then((trip) => {
      if (trip) {
        setActiveTrip(trip as any);
        navigate(`/trip/${trip.id}`);
      }
    }).catch(() => {});
  }, []);

  // Detect location on mount + continuous GPS tracking + compass
  useEffect(() => {
    detectLocation();

    // watchPosition — обновляет координаты + heading из GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const h = pos.coords.heading ?? headingRef.current;
          setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: h });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }

    // Device Orientation — компас телефона для heading
    function handleOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null;
      // iOS: webkitCompassHeading
      if ((e as any).webkitCompassHeading != null) {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android: alpha = 0..360 (compass heading = 360 - alpha)
        heading = (360 - e.alpha) % 360;
      }
      if (heading != null) {
        headingRef.current = Math.round(heading);
        setUserGps((prev) => prev ? { ...prev, heading: Math.round(heading!) } : prev);
      }
    }

    // iOS 13+ requires permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission().then((result: string) => {
        if (result === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      }).catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) {
      useCityFallback();
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickup((prev) => ({ ...prev, lat: latitude, lng: longitude, address: prev.address || 'Определяю...' }));
        setLocationLoading(false);
        geocodeReverse(latitude, longitude).then((address) => {
          setPickup((p) => ({ ...p, address: shortAddress(address) || 'Моё местоположение' }));
        });
      },
      () => {
        useCityFallback();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function useCityFallback() {
    if (user?.cityLat && user?.cityLng && user.cityLat !== 0) {
      setPickup({ address: user.city || 'Мой город', lat: user.cityLat, lng: user.cityLng });
    } else {
      const city = getNearestCity(51.1694, 71.4491); // Астана как дефолт вместо Алматы
      setPickup({ address: city.name, lat: city.lat, lng: city.lng });
    }
    setLocationLoading(false);
  }

  // Calculate route when both points set
  useEffect(() => {
    if (pickup.lat && dropoff.lat) calculateRoute();
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  async function calculateRoute() {
    if (!pickup.lat || !dropoff.lat) return;
    try {
      setCalculatingPrice(true);
      const directions = await getDirections(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      if (!directions) { setError('Не удалось построить маршрут'); return; }
      setRouteGeometry(directions.geometry);
      const estimate = calculateTripPrice(directions.distanceKm, directions.durationMinutes, selectedTariff);
      setPriceEstimate(estimate);
      setTariffPrices(getAllTariffPrices(directions.distanceKm, directions.durationMinutes));
      setPriceAdjustment(0);
      setError('');
      setUiState('tariffs');
      tg?.HapticFeedback?.impactOccurred('medium');
    } catch {
      setError('Ошибка расчёта маршрута');
    } finally {
      setCalculatingPrice(false);
    }
  }

  // Search logic
  function handleSearchInput(text: string) {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSearchResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const proximity = pickup.lat ? { lat: pickup.lat, lng: pickup.lng } : undefined;
        const bbox: [number, number, number, number] | undefined = pickup.lat
          ? [pickup.lng - 0.15, pickup.lat - 0.15, pickup.lng + 0.15, pickup.lat + 0.15]
          : undefined;
        const res = await geocodeForward(text, { country: 'kz', proximity, bbox, limit: 6 });
        setSearchResults(res);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 250);
  }

  function handleSelectAddress(result: GeocodingResult) {
    const point: LocationPoint = { address: shortAddress(result.placeName), lat: result.lat, lng: result.lng };
    if (searchField === 'pickup') {
      setPickup(point);
    } else {
      setDropoff(point);
      saveRecentAddress(point);
    }
    setUiState('map');
    setSearchQuery('');
    setSearchResults([]);
  }

  function handleSelectRecent(point: LocationPoint) {
    setDropoff(point);
    setUiState('map');
  }

  function handleMyLocation() {
    setUiState('map');
    detectLocation();
  }

  function openSearch(field: 'pickup' | 'dropoff') {
    setSearchField(field);
    setSearchQuery(field === 'pickup' ? pickup.address : dropoff.address);
    setUiState('search');
    tg?.HapticFeedback?.impactOccurred('light');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  // Order
  async function handleOrder() {
    if (!priceEstimate) return;
    const tp = tariffPrices.find((t) => t.id === selectedTariff) || tariffPrices[1];
    const finalPrice = Math.max(650, (tp?.price || priceEstimate.price) + priceAdjustment);
    try {
      setOrdering(true);
      setError('');
      const result = await createTrip(userId!, {
        pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.address,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffAddress: dropoff.address,
        distanceKm: priceEstimate.distanceKm, estimatedMinutes: priceEstimate.estimatedMinutes,
        price: finalPrice, tariff: selectedTariff,
        city: user?.city || "",
        femaleDriverOnly,
        clientNote: clientNote.trim(),
      });
      setActiveTrip(result as any);
      tg?.HapticFeedback?.notificationOccurred('success');
      navigate(`/trip/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании запроса');
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setOrdering(false);
    }
  }

  // ===== INTERCITY HANDLERS =====
  const icRouteInfo = icFrom && icTo && icFrom !== icTo ? getRouteInfo(icFrom, icTo) : null;
  const icRecommended = icFrom && icTo && icFrom !== icTo ? getRecommendedPrice(icFrom, icTo) : 3000;
  const icPopularRoutes = icFrom ? getPopularRoutesFrom(icFrom) : [];

  useEffect(() => {
    if (icFrom && icTo && icFrom !== icTo) {
      setIcPricePerSeat(icRecommended);
    }
  }, [icFrom, icTo]);

  function swapIcCities() {
    const tmp = icFrom;
    setIcFrom(icTo);
    setIcTo(tmp);
    tg?.HapticFeedback?.selectionChanged();
  }

  function getMinDatetime() {
    const now = new Date(Date.now() + 3600000);
    return now.toISOString().slice(0, 16);
  }

  const filteredCities = icCitySearch
    ? CITIES.filter((c) => c.name.toLowerCase().includes(icCitySearch.toLowerCase()))
    : CITIES;

  async function handleIntercityOrder() {
    if (!icFrom || !icTo || icFrom === icTo || !icDate || !icRouteInfo) return;
    try {
      setIcOrdering(true);
      setError('');
      const scheduledAt = new Date(`${icDate}${icTime ? 'T' + icTime : 'T08:00'}`).toISOString();
      const result = await createIntercityTrip(userId!, {
        departureCity: icFrom,
        destinationCity: icTo,
        scheduledAt,
        seatsRequested: icFullCar ? 4 : icSeats,
        pricePerSeat: icPricePerSeat,
        fullCar: icFullCar,
        hasBaggage: icBaggage,
        distanceKm: icRouteInfo.distanceKm,
        estimatedHours: icRouteInfo.estimatedHours,
        femaleDriverOnly: icFemaleOnly,
        clientNote: icNote.trim(),
      });
      setActiveTrip(result as any);
      tg?.HapticFeedback?.notificationOccurred('success');
      navigate(`/trip/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании запроса');
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setIcOrdering(false);
    }
  }

  // Sheet drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
  }, [sheetHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    setSheetHeight(Math.max(10, Math.min(85, dragStartHeight.current + deltaPercent)));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (sheetHeight < 20) { setUiState('map'); setSheetHeight(45); }
    else if (sheetHeight > 65) setSheetHeight(85);
    else setSheetHeight(45);
  }, [sheetHeight]);

  // Helpers
  function shortAddress(addr: string): string {
    const parts = addr.split(',').map((s) => s.trim());
    return parts.slice(0, 2).join(', ');
  }

  const currentTariffData = tariffPrices.find((t) => t.id === selectedTariff);
  const tariffPrice = currentTariffData?.price || priceEstimate?.price || 0;
  const displayPrice = Math.max(650, tariffPrice + priceAdjustment);

  // ==================== RENDER ====================

  // ===== SEARCH OVERLAY =====
  if (uiState === 'search') {
    return (
      <div className="h-full w-full bg-white flex flex-col safe-top safe-bottom">
        {/* Header with inputs */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
          {/* Pickup */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <button
              onClick={() => { setSearchField('pickup'); setSearchQuery(pickup.address); }}
              className={`flex-1 text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                searchField === 'pickup' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500'
              }`}
            >
              {pickup.address || 'Откуда?'}
            </button>
          </div>

          {/* Connecting line */}
          <div className="ml-[5px] w-0.5 h-2 bg-gray-300 mb-1" />

          {/* Dropoff */}
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
            {searchField === 'dropoff' ? (
              <div className="flex-1 flex items-center bg-gray-100 rounded-lg overflow-hidden">
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Куда поедете?"
                  className="flex-1 text-sm py-2.5 px-3 bg-transparent outline-none text-gray-900"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="px-2">
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setSearchField('dropoff'); setSearchQuery(dropoff.address); }}
                className="flex-1 text-left text-sm py-2 px-3 text-gray-500 rounded-lg"
              >
                {dropoff.address || 'Куда поедете?'}
              </button>
            )}
          </div>

          {/* Map button */}
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setUiState('map')}
              className="text-sm text-blue-500 font-medium px-2 py-1"
            >
              Карта
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* My location */}
          <button
            onClick={handleMyLocation}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 border-b border-gray-50"
          >
            <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
              <Navigation size={16} className="text-blue-500" />
            </div>
            <span className="text-sm text-blue-600 font-medium">Моё местоположение</span>
          </button>

          {/* Search loading */}
          {isSearching && searchQuery.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-4 justify-center">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Поиск...</span>
            </div>
          )}

          {/* Search results */}
          {searchResults.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectAddress(r)}
              className="w-full flex items-start gap-3 px-4 py-3.5 active:bg-gray-50 border-b border-gray-50"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-gray-500" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm text-gray-900 font-medium truncate">{r.text}</p>
                <p className="text-xs text-gray-400 truncate">{shortAddress(r.placeName)}</p>
              </div>
            </button>
          ))}

          {/* Empty results */}
          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          )}

          {/* Recent addresses */}
          {searchQuery.length < 2 && recentAddresses.length > 0 && (
            <div className="pt-2">
              <p className="px-4 py-2 text-xs text-gray-400 font-medium uppercase tracking-wider">Недавние</p>
              {recentAddresses.map((addr, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectAddress({ id: String(i), placeName: addr.address, text: addr.address, lat: addr.lat, lng: addr.lng, relevance: 1 })}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 border-b border-gray-50"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-700 truncate">{addr.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== MAIN MAP VIEW =====
  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView
          className="w-full h-full"
          center={pickup.lat ? { lat: pickup.lat, lng: pickup.lng } : undefined}
          pickupLocation={pickup.lat ? pickup : null}
          dropoffLocation={dropoff.lat ? dropoff : null}
          userLocation={userGps}
          routeGeometry={routeGeometry}
          onMapClick={(lat, lng) => {
            if (!dropoff.lat) {
              geocodeReverse(lat, lng).then((addr) => {
                setDropoff({ address: shortAddress(addr), lat, lng });
                saveRecentAddress({ address: shortAddress(addr), lat, lng });
              });
            }
          }}
        />
      </div>

      {/* ===== TOP BAR ===== */}
      <div className="absolute top-0 left-0 right-0 safe-top z-20">
        {/* Menu + trust badge + history */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hub')}
              className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
            >
              <LayoutGrid size={20} className="text-gray-700" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
            >
              <User size={20} className="text-gray-700" />
            </button>
          </div>
          {user && <TrustBadge score={user.trustScore} size="sm" />}
          <button
            onClick={() => navigate('/history')}
            className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
          >
            <History size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="px-4 mb-2">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-sm flex p-1 border border-gray-100">
            <button
              onClick={() => { setTripMode('city'); setIcSelectingField(null); tg?.HapticFeedback?.selectionChanged(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tripMode === 'city' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              <Car size={14} /> По городу
            </button>
            <button
              onClick={() => { setTripMode('intercity'); tg?.HapticFeedback?.selectionChanged(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tripMode === 'intercity' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              <ArrowRightLeft size={14} /> Межгород
            </button>
          </div>
        </div>

        {/* Address bar (city mode only) */}
        {tripMode === 'city' && (
        <div className="px-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* From */}
            <button
              onClick={() => openSearch('pickup')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm text-gray-500 truncate">
                От: <span className="text-gray-800 font-medium">{pickup.address || 'Определяю...'}</span>
              </span>
            </button>
            <div className="h-px bg-gray-100 ml-9" />
            {/* To */}
            <button
              onClick={() => openSearch('dropoff')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span className={`text-sm ${dropoff.address ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {dropoff.address || 'Куда?'}
              </span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ===== LOCATE ME BUTTON ===== */}
      {uiState === 'map' && !priceEstimate && (
        <button
          onClick={detectLocation}
          className="absolute right-4 bottom-36 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Navigation size={20} className="text-blue-500" />
        </button>
      )}

      {/* ===== RECENT ADDRESSES (bottom, only when no tariffs shown) ===== */}
      {uiState === 'map' && !priceEstimate && recentAddresses.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 safe-bottom">
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
            {recentAddresses.slice(0, 3).map((addr, i) => (
              <button
                key={i}
                onClick={() => handleSelectRecent(addr)}
                className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[100px] max-w-[120px]"
              >
                <div className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
                  <Clock size={18} className="text-gray-500" />
                </div>
                <span className="text-xs text-gray-600 text-center leading-tight line-clamp-2 font-medium">
                  {addr.address}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== CALCULATING SPINNER ===== */}
      {calculatingPrice && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-sm text-gray-700 font-medium">Рассчитываем маршрут...</span>
          </div>
        </div>
      )}

      {/* ===== TARIFF BOTTOM SHEET ===== */}
      {uiState === 'tariffs' && priceEstimate && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-25 bg-black/10"
            onClick={() => { setUiState('map'); setPriceEstimate(null); setRouteGeometry(null); setDropoff({ address: '', lat: 0, lng: 0 }); }}
          />

          <div
            className={`absolute left-0 right-0 bottom-0 z-30 ${isDragging ? '' : 'transition-all duration-300 ease-out'}`}
            style={{ height: `${sheetHeight}vh` }}
          >
            <div className="h-full bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
              {/* Drag handle */}
              <div
                className="flex-shrink-0 pt-3 pb-1 cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
              </div>

              {/* Route summary */}
              <div className="flex-shrink-0 px-5 pb-3 flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Navigation size={12} className="text-blue-500" />
                  <span className="font-medium">{priceEstimate.distanceKm.toFixed(1)} км</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} className="text-blue-500" />
                  <span className="font-medium">~{priceEstimate.estimatedMinutes} мин</span>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => { setUiState('map'); setPriceEstimate(null); setRouteGeometry(null); setDropoff({ address: '', lat: 0, lng: 0 }); }}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5">
                {/* Category cards */}
                <p className="text-xs text-gray-400 mb-2">Категория авто</p>
                <div className="space-y-2 mb-4">
                  {tariffPrices.map((t) => {
                    const isActive = selectedTariff === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTariff(t.id as TariffId); setPriceAdjustment(0); tg?.HapticFeedback?.selectionChanged(); }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                          style={{
                            backgroundColor: t.id === 'business'
                              ? (isActive ? '#1e293b' : '#334155')
                              : (isActive ? t.color : '#f1f5f9'),
                          }}
                        >
                          <img
                            src={t.icon}
                            alt={t.name}
                            className="w-10 h-10 object-contain"
                            style={
                              t.id === 'business'
                                ? { filter: `brightness(2.5) contrast(1.3)`, opacity: isActive ? 1 : 0.7 }
                                : { mixBlendMode: 'screen' as const, opacity: isActive ? 1 : 0.7 }
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>{t.name}</p>
                            {t.id === 'narodniy' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">−18%</span>}
                            {t.id === 'business' && <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded-full font-medium">VIP</span>}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{t.desc}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                            {t.price.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-400">тг</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Price section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Ваша цена</p>

                  <div className="flex items-center justify-center gap-3 mb-3">
                    <button
                      onClick={() => { tg?.HapticFeedback?.impactOccurred('light'); setPriceAdjustment((a) => Math.max(-tariffPrice + 650, a - 100)); }}
                      className="w-12 h-11 rounded-xl bg-white border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center active:scale-95 shadow-sm"
                    >-100</button>
                    <div className="px-3 min-w-[5.5rem]">
                      <p className="text-2xl font-extrabold text-blue-600 text-center">{displayPrice.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 text-center">тенге</p>
                    </div>
                    <button
                      onClick={() => { tg?.HapticFeedback?.impactOccurred('light'); setPriceAdjustment((a) => a + 100); }}
                      className="w-12 h-11 rounded-xl bg-white border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center active:scale-95 shadow-sm"
                    >+100</button>
                  </div>

                  {priceAdjustment !== 0 && (
                    <p className="text-center text-xs text-gray-400">
                      Средняя: <span className="line-through">{tariffPrice.toLocaleString()} тг</span>
                      <span className={`ml-1 font-medium ${priceAdjustment > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                        ({priceAdjustment > 0 ? '+' : ''}{priceAdjustment})
                      </span>
                    </p>
                  )}
                  {/* Price breakdown toggle */}
                  <button
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="flex items-center justify-center gap-1 mx-auto mt-2 text-[11px] text-blue-500 font-medium"
                  >
                    <Info size={12} />
                    {showBreakdown ? 'Скрыть расчёт' : 'Как формируется цена?'}
                    {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showBreakdown && currentTariffData && priceEstimate && (
                    <div className="mt-2 bg-white/80 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Подача</span>
                        <span className="font-medium">{priceEstimate.breakdown.baseFare.toLocaleString()} тг</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Расстояние ({priceEstimate.distanceKm.toFixed(1)} км)</span>
                        <span className="font-medium">{priceEstimate.breakdown.distanceFare.toLocaleString()} тг</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Время (~{priceEstimate.estimatedMinutes} мин)</span>
                        <span className="font-medium">{priceEstimate.breakdown.timeFare.toLocaleString()} тг</span>
                      </div>
                      <div className="h-px bg-gray-200 my-1" />
                      <div className="flex justify-between text-gray-600">
                        <span>Тариф «{currentTariffData.name}»</span>
                        <span className="font-medium">×{(TARIFF_LIST.find((t) => t.id === selectedTariff)?.multiplier || 1).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-800 font-semibold pt-1">
                        <span>Итого</span>
                        <span>{tariffPrice.toLocaleString()} тг</span>
                      </div>
                    </div>
                  )}

                  <p className="text-center text-[10px] text-gray-300 mt-2">Справочный расчёт. Итоговую сумму стороны определяют самостоятельно.</p>
                </div>

                {/* Preferences section */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Предпочтения</p>

                  {/* Female driver only */}
                  <button
                    onClick={() => { setFemaleDriverOnly(v => !v); tg?.HapticFeedback?.selectionChanged(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                      femaleDriverOnly ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      femaleDriverOnly ? 'bg-pink-100' : 'bg-gray-100'
                    }`}>
                      <ShieldCheck size={16} className={femaleDriverOnly ? 'text-pink-500' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${femaleDriverOnly ? 'text-pink-700' : 'text-gray-700'}`}>
                        Только женщина-водитель
                      </p>
                      <p className="text-[11px] text-gray-400">Водитель женского пола</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${
                      femaleDriverOnly ? 'bg-pink-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        femaleDriverOnly ? 'left-[18px]' : 'left-0.5'
                      }`} />
                    </div>
                  </button>

                  {/* Client note */}
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-gray-400 mt-2.5 shrink-0" />
                    <input
                      type="text"
                      value={clientNote}
                      onChange={(e) => setClientNote(e.target.value)}
                      placeholder="Пожелания к поездке (необязательно)"
                      className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                      maxLength={100}
                    />
                  </div>

                  {/* Cash only badge */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
                    <Banknote size={16} className="text-green-600 shrink-0" />
                    <span className="text-xs text-green-700 font-medium">Оплата наличными водителю</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 mb-4 text-sm">{error}</div>
                )}
              </div>

              {/* Sticky order button */}
              <div className="flex-shrink-0 px-5 pb-5 safe-bottom bg-white border-t border-gray-50 pt-3">
                <Button
                  fullWidth
                  size="lg"
                  loading={ordering}
                  disabled={!priceEstimate || !dropoff.address}
                  onClick={handleOrder}
                >
                  Опубликовать запрос · {displayPrice.toLocaleString()} тг · Наличные
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== INTERCITY FORM OVERLAY ===== */}
      {tripMode === 'intercity' && !icSelectingField && (
        <div className="absolute left-0 right-0 bottom-0 z-30 max-h-[80vh]">
          <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="flex-shrink-0 pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Межгород</h3>

              {/* From / To cities */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 space-y-2">
                  <button
                    onClick={() => setIcSelectingField('from')}
                    className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                      icFrom ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                    <span className={`text-sm flex-1 ${icFrom ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {icFrom || 'Откуда'}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                  <button
                    onClick={() => setIcSelectingField('to')}
                    className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                      icTo ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                    <span className={`text-sm flex-1 ${icTo ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {icTo || 'Куда'}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                </div>
                <button
                  onClick={swapIcCities}
                  className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center active:scale-95 shrink-0"
                >
                  <ArrowRightLeft size={16} className="text-indigo-500" />
                </button>
              </div>

              {/* Route info */}
              {icRouteInfo && (
                <div className="flex items-center gap-4 mb-3 px-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Navigation size={12} className="text-indigo-500" />
                    <span className="font-medium">{icRouteInfo.distanceKm} км</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} className="text-indigo-500" />
                    <span className="font-medium">~{icRouteInfo.estimatedHours < 1 ? `${Math.round(icRouteInfo.estimatedHours * 60)} мин` : `${icRouteInfo.estimatedHours} ч`}</span>
                  </div>
                </div>
              )}

              {/* Popular routes shortcut */}
              {!icTo && icPopularRoutes.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Популярные направления</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {icPopularRoutes.slice(0, 5).map((r) => (
                      <button
                        key={r.to}
                        onClick={() => { setIcTo(r.to); tg?.HapticFeedback?.selectionChanged(); }}
                        className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 rounded-lg text-xs text-indigo-700 font-medium active:scale-95"
                      >
                        {r.to} · {r.recommendedPricePerSeat.toLocaleString()} тг
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date & time */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Дата</label>
                  <div className="relative">
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={icDate}
                      onChange={(e) => setIcDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div className="w-28">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Время</label>
                  <input
                    type="time"
                    value={icTime}
                    onChange={(e) => setIcTime(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Seats */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Мест</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setIcSeats((s) => Math.max(1, s - 1)); setIcFullCar(false); tg?.HapticFeedback?.selectionChanged(); }}
                      disabled={icFullCar}
                      className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95 disabled:opacity-30"
                    >
                      <Minus size={16} className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-indigo-500" />
                      <span className="text-lg font-bold text-gray-900 w-6 text-center">{icFullCar ? 4 : icSeats}</span>
                    </div>
                    <button
                      onClick={() => { setIcSeats((s) => Math.min(4, s + 1)); setIcFullCar(false); tg?.HapticFeedback?.selectionChanged(); }}
                      disabled={icFullCar || icSeats >= 4}
                      className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95 disabled:opacity-30"
                    >
                      <Plus size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { setIcFullCar((v) => !v); tg?.HapticFeedback?.selectionChanged(); }}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    icFullCar ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <Car size={14} className="inline mr-1" />
                  Вся машина
                </button>

                <button
                  onClick={() => { setIcBaggage((v) => !v); tg?.HapticFeedback?.selectionChanged(); }}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    icBaggage ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <Briefcase size={14} className="inline mr-1" />
                  Багаж
                </button>
              </div>

              {/* Price per seat */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 mb-3">
                <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">
                  Цена {icFullCar ? 'за всю машину' : 'за 1 место'}
                </p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <button
                    onClick={() => { setIcPricePerSeat((p) => Math.max(500, p - 500)); tg?.HapticFeedback?.impactOccurred('light'); }}
                    className="w-11 h-11 rounded-xl bg-white border border-indigo-200 text-indigo-600 font-bold text-xs flex items-center justify-center active:scale-95 shadow-sm"
                  >−500</button>
                  <div className="px-3">
                    <p className="text-2xl font-extrabold text-indigo-600">{icPricePerSeat.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 text-center">тенге</p>
                  </div>
                  <button
                    onClick={() => { setIcPricePerSeat((p) => p + 500); tg?.HapticFeedback?.impactOccurred('light'); }}
                    className="w-11 h-11 rounded-xl bg-white border border-indigo-200 text-indigo-600 font-bold text-xs flex items-center justify-center active:scale-95 shadow-sm"
                  >+500</button>
                </div>
                {icRecommended > 0 && icPricePerSeat !== icRecommended && (
                  <p className="text-center text-xs text-gray-400">
                    Средняя: {icRecommended.toLocaleString()} тг
                  </p>
                )}
                {icFullCar && (
                  <p className="text-center text-xs text-indigo-500 font-medium mt-1">
                    Итого: {(icPricePerSeat * 4).toLocaleString()} тг за всю машину
                  </p>
                )}
                {!icFullCar && icSeats > 1 && (
                  <p className="text-center text-xs text-indigo-500 font-medium mt-1">
                    Итого: {(icPricePerSeat * icSeats).toLocaleString()} тг за {icSeats} мест
                  </p>
                )}
                <p className="text-center text-[10px] text-gray-300 mt-2">Справочный расчёт. Итоговую сумму стороны определяют самостоятельно.</p>
              </div>

              {/* Preferences */}
              <div className="space-y-2 mb-3">
                <button
                  onClick={() => { setIcFemaleOnly((v) => !v); tg?.HapticFeedback?.selectionChanged(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all text-xs ${
                    icFemaleOnly ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <ShieldCheck size={14} className={icFemaleOnly ? 'text-pink-500' : 'text-gray-400'} />
                  <span className={`flex-1 font-medium ${icFemaleOnly ? 'text-pink-700' : 'text-gray-600'}`}>Только женщина-водитель</span>
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${icFemaleOnly ? 'bg-pink-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${icFemaleOnly ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                </button>
                <div className="flex items-start gap-2">
                  <MessageSquare size={14} className="text-gray-400 mt-2.5 shrink-0" />
                  <input
                    type="text"
                    value={icNote}
                    onChange={(e) => setIcNote(e.target.value)}
                    placeholder="Пожелания (необязательно)"
                    className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400"
                    maxLength={150}
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
                  <Banknote size={14} className="text-green-600 shrink-0" />
                  <span className="text-[11px] text-green-700 font-medium">Оплата наличными водителю</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 mb-3 text-sm">{error}</div>
              )}
            </div>

            {/* Submit button */}
            <div className="flex-shrink-0 px-5 pb-5 safe-bottom bg-white border-t border-gray-50 pt-3">
              <Button
                fullWidth
                size="lg"
                loading={icOrdering}
                disabled={!icFrom || !icTo || icFrom === icTo || !icDate || icPricePerSeat < 500}
                onClick={handleIntercityOrder}
              >
                Опубликовать · {icFrom && icTo ? `${icFrom} → ${icTo}` : 'Межгород'} · {(icFullCar ? icPricePerSeat * 4 : icPricePerSeat * icSeats).toLocaleString()} тг
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTERCITY CITY SELECTOR ===== */}
      {icSelectingField && (
        <div className="absolute inset-0 z-40 bg-white flex flex-col safe-top safe-bottom">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
            <button onClick={() => { setIcSelectingField(null); setIcCitySearch(''); }}>
              <X size={24} className="text-gray-500" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">
              {icSelectingField === 'from' ? 'Откуда' : 'Куда'}
            </h3>
          </div>
          <div className="px-4 py-2">
            <input
              type="text"
              value={icCitySearch}
              onChange={(e) => setIcCitySearch(e.target.value)}
              placeholder="Поиск города..."
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCities.map((city) => {
              const isDisabled = icSelectingField === 'from' ? city.name === icTo : city.name === icFrom;
              return (
                <button
                  key={city.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (icSelectingField === 'from') setIcFrom(city.name);
                    else setIcTo(city.name);
                    setIcSelectingField(null);
                    setIcCitySearch('');
                    tg?.HapticFeedback?.selectionChanged();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 active:bg-gray-50 ${
                    isDisabled ? 'opacity-30' : ''
                  }`}
                >
                  <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-indigo-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{city.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
