'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { STATIONS, Station } from '@/src/data/transitNetwork';
import { PlaceTarget } from '@/src/lib/transitEngine';
import { searchPOIs, POILocation } from '@/src/lib/poiService';
import {
  Search,
  X,
  Check,
  Building2,
  Train,
  Bus,
  Landmark,
  Loader2,
  Navigation,
  Plane,
} from 'lucide-react';

interface StationComboboxProps {
  label: string;
  selectedStationId?: string | null;
  selectedPlace?: PlaceTarget | null;
  onSelect?: (stationId: string | null) => void;
  onSelectPlace?: (place: PlaceTarget | null) => void;
  onUseCurrentLocation?: () => void;
  placeholder?: string;
  dotColor?: string;
}

type SearchItem =
  | { type: 'station'; data: Station }
  | { type: 'poi'; data: POILocation };

export default function StationCombobox({
  label,
  selectedStationId,
  selectedPlace,
  onSelect,
  onSelectPlace,
  onUseCurrentLocation,
  placeholder = 'Cari stasiun, halte, atau tempat (contoh: BCA)...',
  dotColor = 'bg-emerald-400',
}: StationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [poiResults, setPoiResults] = useState<POILocation[]>([]);
  const [isSearchingPoi, setIsSearchingPoi] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected station fallback
  const selectedStation = useMemo(
    () => (selectedStationId ? STATIONS.find((s) => s.id === selectedStationId) || null : null),
    [selectedStationId]
  );

  const displayName = useMemo(() => {
    if (selectedPlace?.name) return selectedPlace.name;
    if (selectedStation?.name) return selectedStation.name;
    return '';
  }, [selectedPlace, selectedStation]);

  // Debounced POI search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setPoiResults([]);
      setIsSearchingPoi(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingPoi(true);

    const timer = setTimeout(async () => {
      try {
        const pois = await searchPOIs(query, { limit: 5, signal: controller.signal });
        // Filter out stations because they are already in local station list
        const nonStationPois = pois.filter((p) => p.category !== 'station');
        setPoiResults(nonStationPois);
      } catch {
        setPoiResults([]);
      } finally {
        setIsSearchingPoi(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Combine stations and POIs into a single search list
  const combinedItems: SearchItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();

    let matchedStations = STATIONS;
    if (q) {
      matchedStations = STATIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.lines.some((l) => l.toLowerCase().includes(q)) ||
          (s.lines.includes('kai-bandara') && 'bandara airport soekarno hatta shia ka bandara basoetta'.includes(q)) ||
          (s.type === 'krl' && 'krl commuterline kereta kci'.includes(q)) ||
          (s.type === 'tj' && 'transjakarta tj bus busway halte transj'.includes(q)) ||
          (s.type === 'mrt' && 'mrt ratangga mrtj kereta bawah tanah subway'.includes(q)) ||
          (s.type === 'lrt' && 'lrt jabodebek lrtj lrt jakarta kereta ringan'.includes(q))
      );
    }

    const stationItems: SearchItem[] = matchedStations.slice(0, 10).map((s) => ({
      type: 'station',
      data: s,
    }));

    const poiItems: SearchItem[] = poiResults.map((p) => ({
      type: 'poi',
      data: p,
    }));

    return [...stationItems, ...poiItems];
  }, [query, poiResults]);

  // Reset highlight index on list change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [combinedItems]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < combinedItems.length - 1 ? prev + 1 : 0
      );
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : combinedItems.length - 1
      );
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[highlightedIndex]) {
        handleSelectItem(combinedItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === 'station') {
      const station = item.data;
      onSelect?.(station.id);
      onSelectPlace?.({
        name: station.name,
        coords: station.coords,
        stationId: station.id,
      });
    } else {
      const poi = item.data;
      onSelect?.(null);
      onSelectPlace?.({
        name: poi.name,
        coords: poi.coords,
      });
    }
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(null);
    onSelectPlace?.(null);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotColor} inline-block`} />
        {label}
      </label>

      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`relative flex items-center w-full bg-white dark:bg-zinc-900 border rounded-lg py-2 px-3 transition cursor-text ${
          isOpen ? 'border-sky-500 ring-1 ring-sky-500/30' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0 mr-2" />

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayName}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={displayName || placeholder}
          className="w-full bg-transparent text-xs text-slate-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />

        {isSearchingPoi && (
          <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin mr-1.5 shrink-0" />
        )}

        {onUseCurrentLocation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUseCurrentLocation();
              setIsOpen(false);
              setQuery('');
            }}
            className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1 transition shrink-0 mr-1.5"
            title="Gunakan Lokasi GPS Saya"
          >
            <Navigation className="w-2.5 h-2.5 transform -rotate-45" />
            <span>Lokasi Saya</span>
          </button>
        )}

        {(displayName || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:text-zinc-300 p-0.5 rounded transition shrink-0"
            title="Hapus pilihan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in max-h-72 flex flex-col">
          <ul ref={listRef} className="overflow-y-auto py-1.5 focus:outline-none divide-y divide-slate-100 dark:divide-zinc-800/60">
            {onUseCurrentLocation && (
              <li
                onClick={() => {
                  onUseCurrentLocation();
                  setIsOpen(false);
                  setQuery('');
                }}
                className="px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border-b border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition"
              >
                <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 transform -rotate-45" />
                <div className="min-w-0">
                  <span className="block truncate">Gunakan Lokasi Saya Saat Ini</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                    Otomatis deteksi GPS posisi Anda
                  </span>
                </div>
              </li>
            )}

            {combinedItems.length === 0 ? (
              <li className="px-3.5 py-4 text-xs text-slate-500 dark:text-zinc-500 text-center">
                {isSearchingPoi ? 'Mencari tempat...' : 'Tidak ditemukan stasiun atau lokasi.'}
              </li>
            ) : (
              combinedItems.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;

                if (item.type === 'station') {
                  const s = item.data;
                  const isSelected = selectedStationId === s.id;
                  const isAirport = s.lines.includes('kai-bandara');

                  return (
                    <li
                      key={`st_${s.id}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectItem(item)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer transition text-xs ${
                        isHighlighted
                          ? 'bg-sky-50 dark:bg-zinc-800/80 text-sky-950 dark:text-zinc-100'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isAirport ? (
                          <Plane className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        ) : s.type === 'krl' ? (
                          <Train className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                        ) : s.type === 'mrt' ? (
                          <Train className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                        ) : s.type === 'lrt' ? (
                          <Train className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Bus className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{s.name}</span>
                            {s.code && (
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                {s.code}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                            {isAirport
                              ? 'KAI Bandara (Railink)'
                              : s.type === 'krl'
                              ? 'KRL Commuterline'
                              : s.type === 'mrt'
                              ? 'MRT Jakarta'
                              : s.type === 'lrt'
                              ? 'LRT'
                              : 'TransJakarta BRT'}
                            {s.isInterchange ? ' • Simpul Transit' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                            isAirport
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                              : s.type === 'krl'
                              ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50'
                              : s.type === 'mrt'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                              : s.type === 'lrt'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                          }`}
                        >
                          {isAirport ? 'BANDARA' : s.type.toUpperCase()}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                      </div>
                    </li>
                  );
                }

                // POI Item
                const p = item.data;
                const isSelected = selectedPlace?.name === p.name;

                return (
                  <li
                    key={`poi_${p.id}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectItem(item)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition text-xs ${
                      isHighlighted
                        ? 'bg-sky-50 dark:bg-zinc-800/80 text-sky-950 dark:text-zinc-100'
                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {p.category === 'landmark' ? (
                        <Landmark className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      )}

                      <div className="min-w-0">
                        <span className="font-medium truncate block">{p.name}</span>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">{p.label}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {p.category}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
