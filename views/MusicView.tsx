import React from 'react';
import { STOCK_MUSIC } from '../types';
import { Music, CheckCircle, Play, Pause, Volume2 } from 'lucide-react';

interface MusicViewProps {
  selectedMusic: string | null;
  onSelectMusic: (url: string | null) => void;
  volume: number;
  setVolume: (vol: number) => void;
}

export const MusicView: React.FC<MusicViewProps> = ({ selectedMusic, onSelectMusic, volume, setVolume }) => {
  const [playingPreview, setPlayingPreview] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePreview = (url: string) => {
    if (playingPreview === url) {
        audioRef.current?.pause();
        setPlayingPreview(null);
    } else {
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.volume = volume;
            audioRef.current.play();
            setPlayingPreview(url);
        }
    }
  };

  // Update preview volume when slider changes
  React.useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  return (
    <div className="h-full p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Música de Fundo</h2>
      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingPreview(null)} />

      {/* Volume Control */}
      <div className="mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
              <Volume2 size={20} className="text-purple-600" />
              <span className="font-medium text-gray-700">Volume da Música</span>
          </div>
          <div className="flex items-center gap-4">
              <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <span className="text-sm font-medium text-gray-500 w-12">{Math.round(volume * 100)}%</span>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* None Option */}
        <div 
            onClick={() => onSelectMusic(null)}
            className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all
            ${selectedMusic === null ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'}
        `}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Music size={18} />
                </div>
                <span className="font-medium text-gray-700">Sem Música</span>
            </div>
            {selectedMusic === null && <CheckCircle size={20} className="text-purple-600" />}
        </div>

        {STOCK_MUSIC.map((track) => (
            <div 
                key={track.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all
                ${selectedMusic === track.url ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'}
            `}>
                <div className="flex items-center gap-4">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePreview(track.url); }}
                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800"
                     >
                        {playingPreview === track.url ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" className="ml-1"/>}
                     </button>
                     <div>
                         <h4 className="font-medium text-gray-900">{track.name}</h4>
                         <p className="text-xs text-gray-500">Stock Library</p>
                     </div>
                </div>

                <button 
                    onClick={() => onSelectMusic(track.url)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${selectedMusic === track.url ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                >
                    {selectedMusic === track.url ? 'Selecionado' : 'Usar'}
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};
