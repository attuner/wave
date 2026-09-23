import React, { useState } from 'react';
import { RadioStation, StationGenre } from '../types/radio';
import { Search, Heart, Plus, Radio, Wifi, Music, Globe } from 'lucide-react';

interface StationListProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  onSelectStation: (station: RadioStation) => void;
  favorites: string[];
  onToggleFavorite: (stationId: string) => void;
  onAddCustomStation: (station: RadioStation) => void;
}

export const StationList: React.FC<StationListProps> = ({
  stations,
  currentStation,
  isPlaying,
  onSelectStation,
  favorites,
  onToggleFavorite,
  onAddCustomStation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTagline, setCustomTagline] = useState('');

  const genres = [
    { id: 'all', label: 'All Streams' },
    { id: 'favorites', label: '★ Favorites' },
    { id: 'broadcast', label: 'Live Broadcast' },
    { id: 'ambient', label: 'Ambient' },
    { id: 'lofi', label: 'Lo-Fi' },
    { id: 'electronic', label: 'Electronic' },
    { id: 'indie', label: 'Indie' },
    { id: 'classical', label: 'Classical' },
  ];

  const filteredStations = stations.filter((station) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (station.location && station.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedGenre === 'favorites') {
      return favorites.includes(station.id);
    }
    if (selectedGenre !== 'all') {
      return station.genre === selectedGenre;
    }
    return true;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    const newStation: RadioStation = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      tagline: customTagline.trim() || 'Custom Radio Stream',
      genre: 'custom',
      streamUrl: customUrl.trim(),
      bitrate: 192,
      location: 'Custom URL',
      logoBg: 'from-blue-600 to-indigo-800',
    };

    onAddCustomStation(newStation);
    setCustomName('');
    setCustomUrl('');
    setCustomTagline('');
    setIsAddingCustom(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-4 md:p-6 backdrop-blur-xl">
      {/* Search & Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stations, genres, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
        <button
          onClick={() => setIsAddingCustom(!isAddingCustom)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition shrink-0"
          title="Add Custom Direct Stream URL"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Add Stream</span>
        </button>
      </div>

      {/* Add Custom Stream Form */}
      {isAddingCustom && (
        <form onSubmit={handleCreateCustom} className="mb-4 p-4 rounded-2xl bg-slate-800/90 border border-cyan-500/30 space-y-3">
          <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Add Custom Icecast/MP3 Radio Stream</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Station Name (e.g. My Favorite FM)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Tagline / Description"
              value={customTagline}
              onChange={(e) => setCustomTagline(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <input
            type="url"
            placeholder="Direct Stream URL (e.g. https://example.com/live.mp3)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingCustom(false)}
              className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Save Station
            </button>
          </div>
        </form>
      )}

      {/* Genre Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGenre(g.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedGenre === g.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Station List Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredStations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No radio stations found matching your criteria.
          </div>
        ) : (
          filteredStations.map((st) => {
            const isCurrent = currentStation?.id === st.id;
            const isFav = favorites.includes(st.id);

            return (
              <div
                key={st.id}
                onClick={() => onSelectStation(st)}
                className={`group relative flex items-center justify-between p-3 rounded-2xl cursor-pointer transition border ${
                  isCurrent
                    ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Station Art / Avatar */}
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${
                      st.logoBg || 'from-cyan-600 to-blue-800'
                    } flex items-center justify-center text-white shrink-0 shadow-sm relative overflow-hidden`}
                  >
                    {st.isBroadcastChannel ? (
                      <Radio className="w-5 h-5 text-white" />
                    ) : st.isProcedural ? (
                      <Music className="w-5 h-5 text-white" />
                    ) : (
                      <Wifi className="w-5 h-5 text-white" />
                    )}

                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                        <span className="w-1 bg-cyan-400 h-3 animate-pulse rounded-full" />
                        <span className="w-1 bg-cyan-400 h-5 animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 bg-cyan-400 h-2 animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-cyan-300' : 'text-slate-100 group-hover:text-white'}`}>
                        {st.name}
                      </span>
                      {st.isBroadcastChannel && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                          LIVE
                        </span>
                      )}
                      {st.isProcedural && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {st.tagline}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>{st.bitrate} kbps</span>
                      {st.location && (
                        <>
                          <span>•</span>
                          <span>{st.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Favorite Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(st.id);
                    }}
                    className={`p-2 rounded-xl transition ${
                      isFav
                        ? 'text-rose-400 hover:text-rose-300'
                        : 'text-slate-500 hover:text-slate-300 opacity-60 group-hover:opacity-100'
                    }`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
