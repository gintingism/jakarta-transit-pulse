'use client';

import React, { useState } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { SavedPlace, SavedPlaceType } from '@/src/lib/savedPlacesService';
import { PlaceTarget } from '@/src/lib/transitEngine';
import { STATION_MAP, Station } from '@/src/data/transitNetwork';
import StationCombobox from './StationCombobox';
import {
  Home,
  Briefcase,
  MapPin,
  X,
  Crosshair,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react';

interface PopularHub {
  name: string;
  stationId: string;
  coords: [number, number];
  tag: string;
}

const POPULAR_HUBS: PopularHub[] = [
  { name: 'Stasiun Sudirman', stationId: 'krl_sudirman', coords: [-6.2023, 106.8236], tag: 'KRL' },
  { name: 'Stasiun Manggarai', stationId: 'krl_manggarai', coords: [-6.2099, 106.8501], tag: 'KRL' },
  { name: 'Stasiun Tanah Abang', stationId: 'krl_tanah_abang', coords: [-6.1856, 106.8109], tag: 'KRL' },
  { name: 'Stasiun Bogor', stationId: 'krl_bogor', coords: [-6.5951, 106.7903], tag: 'KRL' },
  { name: 'Stasiun Bekasi', stationId: 'krl_bekasi', coords: [-6.2361, 106.9996], tag: 'KRL' },
  { name: 'Halte Bundaran HI', stationId: 'mrt_bundaran_hi', coords: [-6.1918, 106.823], tag: 'MRT/TJ' },
  { name: 'Halte Blok M', stationId: 'tj_blok_m', coords: [-6.2444, 106.7982], tag: 'TJ/MRT' },
  { name: 'Dukuh Atas TOD', stationId: 'mrt_dukuh_atas', coords: [-6.2008, 106.8228], tag: 'TOD' },
];

export default function SetPlaceModal() {
  const isSetPlaceModalOpen = useTransitStore((s) => s.isSetPlaceModalOpen);
  const editingPlaceType = useTransitStore((s) => s.editingPlaceType);
  const closeSetPlaceModal = useTransitStore((s) => s.closeSetPlaceModal);
  const savedPlaces = useTransitStore((s) => s.savedPlaces);
  const setSavedPlace = useTransitStore((s) => s.setSavedPlace);
  const removeSavedPlace = useTransitStore((s) => s.removeSavedPlace);
  const userCoords = useTransitStore((s) => s.userCoords);

  const [selectedTarget, setSelectedTarget] = useState<PlaceTarget | null>(null);

  if (!isSetPlaceModalOpen || !editingPlaceType) {
    return null;
  }

  const placeId = editingPlaceType;
  const existingPlace = savedPlaces.find((p) => p.id === placeId);

  const meta = {
    home: {
      title: 'Atur Lokasi Rumah',
      label: 'Rumah',
      icon: <Home className="w-5 h-5 text-emerald-400" />,
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
    work: {
      title: 'Atur Lokasi Kantor / Kampus',
      label: 'Kantor',
      icon: <Briefcase className="w-5 h-5 text-sky-400" />,
      badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    },
    custom: {
      title: 'Atur Lokasi Favorit',
      label: 'Favorit',
      icon: <MapPin className="w-5 h-5 text-amber-400" />,
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    },
  }[editingPlaceType];

  const handleSave = (target: PlaceTarget) => {
    const newPlace: SavedPlace = {
      id: placeId,
      type: editingPlaceType,
      label: meta.label,
      target,
      updatedAt: Date.now(),
    };
    setSavedPlace(newPlace);
    closeSetPlaceModal();
  };

  const handleUseCurrentLocation = () => {
    if (userCoords) {
      handleSave({
        name: `${meta.label} (Lokasi GPS)`,
        coords: userCoords,
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSave({
            name: `${meta.label} (Lokasi GPS)`,
            coords: [pos.coords.latitude, pos.coords.longitude],
          });
        },
        () => {
          // Fallback if permission denied
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleSelectStation = (stationId: string | null) => {
    if (!stationId) return;
    const st = STATION_MAP[stationId];
    if (!st) return;
    handleSave({
      name: st.name,
      coords: st.coords,
      stationId: st.id,
    });
  };

  const handleSelectPlace = (place: PlaceTarget | null) => {
    if (!place) return;
    handleSave(place);
  };

  const handleDelete = () => {
    removeSavedPlace(placeId);
    closeSetPlaceModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeSetPlaceModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-place-title"
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-4 sm:p-5 text-white flex flex-col gap-4 relative animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeBg}`}>
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h3 id="set-place-title" className="text-sm sm:text-base font-bold text-white truncate">
                {meta.title}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Pintasan rute 1-ketuk langsung ke tujuan Anda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSetPlaceModal}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Tutup"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing location status if present */}
        {existingPlace && (
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Tersimpan Saat Ini:</span>
                <span className="text-xs font-semibold text-zinc-100 truncate block">
                  {existingPlace.target.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1 text-[11px] cursor-pointer"
              title="Hapus lokasi tersimpan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          </div>
        )}

        {/* 1-Tap Current Location Option */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="w-full p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-500/30 hover:border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-sky-400 shrink-0 group-hover:scale-110 transition" />
            <span className="truncate">Gunakan Posisi GPS Saya Saat Ini</span>
          </div>
          <span className="text-[10px] text-sky-400 font-mono font-bold bg-sky-500/20 px-1.5 py-0.5 rounded shrink-0">
            1-Tap
          </span>
        </button>

        {/* Search Combobox Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-zinc-300 block">
            Atau Cari Stasiun, Halte, atau Gedung:
          </label>
          <StationCombobox
            label=""
            selectedPlace={selectedTarget}
            onSelect={handleSelectStation}
            onSelectPlace={handleSelectPlace}
            placeholder="Ketik stasiun, halte, atau tempat..."
            dotColor="bg-sky-400"
          />
        </div>

        {/* Popular Hubs Quick Picks */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Pilihan Titik Populer:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={`pop_hub_${hub.stationId}`}
                type="button"
                onClick={() =>
                  handleSave({
                    name: hub.name,
                    coords: hub.coords,
                    stationId: hub.stationId,
                  })
                }
                className="text-[11px] py-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>{hub.name}</span>
                <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30">
                  {hub.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
