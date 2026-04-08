import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Loader2 } from 'lucide-react';
import { getTripHistory } from '../services/firebase';
import { useStore } from '../store/useStore';
import type { Trip } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { userId, user } = useStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      if (!userId) return;
      const data = await getTripHistory(userId, user?.role);
      setTrips(data as Trip[]);
    } catch {} finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-tg-bg safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} className="text-tg-text" />
        </button>
        <h2 className="text-lg font-bold text-tg-text">История поездок</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🚖</p>
            <p className="text-tg-hint">У вас пока нет поездок</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const date = new Date(trip.completedAt || trip.cancelledAt || trip.createdAt);
  const isCancelled = trip.status === 'CANCELLED';
  const isIntercity = (trip as any).tripType === 'INTERCITY';

  return (
    <div className="bg-tg-secondaryBg rounded-2xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isCancelled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
          }`}>
            {isCancelled ? 'Отменена' : 'Завершена'}
          </span>
          {isIntercity && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
              Межгород
            </span>
          )}
        </div>
        <span className="text-xs text-tg-hint">
          {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {isIntercity ? (
        <div className="mb-2">
          <p className="text-sm font-semibold text-tg-text">
            {(trip as any).departureCity} → {(trip as any).destinationCity}
          </p>
          <div className="flex gap-2 text-xs text-tg-hint mt-0.5">
            {(trip as any).seatsRequested && <span>{(trip as any).fullCar ? 'Вся машина' : `${(trip as any).seatsRequested} мест`}</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 mb-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
            <p className="text-xs text-tg-text line-clamp-1">{trip.pickupAddress}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-xs text-tg-text line-clamp-1">{trip.dropoffAddress}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-tg-hint">
        <div className="flex gap-3">
          <span>{trip.distanceKm?.toFixed?.(1) || '?'} км</span>
          {!isIntercity && trip.actualMinutes && <span>{trip.actualMinutes} мин</span>}
          {isIntercity && (trip as any).estimatedHours && <span>~{(trip as any).estimatedHours} ч</span>}
        </div>
        <span className="font-semibold text-tg-text">
          {isIntercity && (trip as any).pricePerSeat
            ? `${((trip as any).pricePerSeat).toLocaleString()} тг/место`
            : `${trip.price?.toLocaleString() || '?'} тг`
          }
        </span>
      </div>
    </div>
  );
}
