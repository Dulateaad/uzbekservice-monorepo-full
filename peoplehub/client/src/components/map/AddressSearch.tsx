import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Loader2, Navigation, Search } from 'lucide-react';
import { geocodeForward, geocodeReverse, type GeocodingResult } from '../../services/geo';

export type Bbox = [number, number, number, number];

interface AddressSearchProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  dotColor?: string;
  proximity?: { lat: number; lng: number } | null;
  bbox?: Bbox | null;
  autoFocus?: boolean;
}

export default function AddressSearch({
  value,
  onChange,
  placeholder = 'Введите адрес',
  dotColor = 'bg-gray-400',
  proximity,
  bbox: bboxProp = null,
  autoFocus = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);
      setShowDropdown(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.length < 2) {
        setResults([]);
        return;
      }

      debounceRef.current = window.setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await geocodeForward(text, {
            country: 'kz',
            proximity: proximity || undefined,
            bbox: bboxProp || undefined,
            limit: 6,
          });
          setResults(res);
        } catch {
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    },
    [proximity, bboxProp]
  );

  function handleSelect(result: GeocodingResult) {
    setQuery(result.placeName);
    setResults([]);
    setShowDropdown(false);
    onChange(result.placeName, result.lat, result.lng);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    onChange('', 0, 0);
    inputRef.current?.focus();
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    setShowDropdown(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await geocodeReverse(latitude, longitude);
        setQuery(address);
        onChange(address, latitude, longitude);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }

  // Shorten display name for suggestions
  function shortName(placeName: string): string {
    const parts = placeName.split(',').map((s) => s.trim());
    return parts.slice(0, 3).join(', ');
  }

  const hasContent = showDropdown && (results.length > 0 || query.length >= 2 || query.length < 2);

  return (
    <div className="relative" ref={containerRef}>
      {/* Input row */}
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0`} />
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 pl-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition-colors"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && <Loader2 size={16} className="animate-spin text-gray-400" />}
            {query && !isSearching && (
              <button onClick={handleClear} className="p-1">
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-6 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-[300px] overflow-y-auto">
          {/* My location */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleUseMyLocation}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-blue-50 text-left border-b border-gray-50"
          >
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
              <Navigation size={14} className="text-blue-500" />
            </div>
            <span className="text-sm text-blue-600 font-medium">Моё местоположение</span>
          </button>

          {/* Loading state */}
          {isSearching && query.length >= 2 && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-4 justify-center">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Поиск адресов...</span>
            </div>
          )}

          {/* Results */}
          {results.map((r, i) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-3 px-4 py-3 active:bg-gray-50 text-left border-b border-gray-50 last:border-b-0"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} className="text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 font-medium truncate">{r.text}</p>
                <p className="text-xs text-gray-400 truncate">{shortName(r.placeName)}</p>
              </div>
            </button>
          ))}

          {/* Empty */}
          {query.length >= 2 && results.length === 0 && !isSearching && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-gray-400">Ничего не найдено. Попробуйте уточнить адрес.</p>
            </div>
          )}

          {/* Hint when input too short */}
          {query.length < 2 && (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-gray-400">Введите минимум 2 символа для поиска</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
