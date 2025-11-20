import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScriptView } from './views/ScriptView';
import { ScenesView } from './views/ScenesView';
import { MusicView } from './views/MusicView';
import { Player } from './components/Player';
import { AppView, Scene, AVAILABLE_VOICES, ImageStyle, SubtitleStyle } from './types';
import { User } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SCRIPT);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New State
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(0.2);
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].name);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageStyle, setImageStyle] = useState<ImageStyle>(ImageStyle.CINEMATIC);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(SubtitleStyle.MODERN);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const handleScriptGenerated = (newScenes: Scene[]) => {
    setScenes(newScenes);
    setCurrentView(AppView.SCENES);
  };

  return (
    <div className="flex h-screen bg-[#F6F7F9] text-slate-800 font-sans overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Center Panel: Tool Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-0">
           
           {/* Header inside panel */}
           <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      AI
                   </div>
                   <span className="font-bold text-lg tracking-tight text-gray-900">VideoCreator</span>
                </div>

                <div className="flex items-center gap-4">
                    <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="text-sm bg-gray-50 border-gray-200 rounded-md py-1.5 px-2 focus:ring-0 focus:border-purple-500 outline-none"
                        title="Select Voice"
                    >
                        {AVAILABLE_VOICES.map(v => (
                            <option key={v.name} value={v.name}>Voz: {v.name} ({v.gender})</option>
                        ))}
                    </select>
                    <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as any)}
                        className="text-sm bg-gray-50 border-gray-200 rounded-md py-1.5 px-2 focus:ring-0 focus:border-purple-500 outline-none"
                        title="Aspect Ratio"
                    >
                        <option value="16:9">16:9 (Horizontal)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                    </select>
                </div>
           </header>

           <div className="flex-1 overflow-hidden relative">
             {currentView === AppView.SCRIPT && (
               <ScriptView 
                  onGenerate={handleScriptGenerated} 
                  isProcessing={isProcessing} 
                  setProcessing={setIsProcessing} 
                />
             )}
             {currentView === AppView.SCENES && (
               <ScenesView 
                  scenes={scenes} 
                  setScenes={setScenes} 
                  selectedVoice={selectedVoice}
                  aspectRatio={aspectRatio}
                  imageStyle={imageStyle}
                  setImageStyle={setImageStyle}
               />
             )}
             {currentView === AppView.MUSIC && (
                <MusicView 
                    selectedMusic={backgroundMusic} 
                    onSelectMusic={setBackgroundMusic}
                    volume={musicVolume}
                    setVolume={setMusicVolume}
                />
             )}
             {currentView === AppView.MEDIA && (
                 <div className="p-10 text-center text-gray-400">Biblioteca de mídia (Em breve)</div>
             )}
           </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="w-[480px] bg-[#F6F7F9] p-6 flex flex-col items-center overflow-y-auto flex-shrink-0 border-l border-gray-200">
           <div className="w-full flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800">Preview</h3>
              <span className="text-xs text-gray-400 font-medium bg-gray-200 px-2 py-1 rounded">Auto Save</span>
           </div>
           
           <Player 
              scenes={scenes} 
              backgroundMusicUrl={backgroundMusic} 
              aspectRatio={aspectRatio}
              musicVolume={musicVolume}
              subtitleStyle={subtitleStyle}
              showSubtitles={showSubtitles}
              setShowSubtitles={setShowSubtitles}
              setSubtitleStyle={setSubtitleStyle}
            />

           {scenes.length > 0 && (
               <div className="w-full mt-8 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                   <h4 className="text-sm font-bold text-gray-700 mb-2">Resumo do Projeto</h4>
                   <div className="space-y-2 text-xs text-gray-500">
                       <div className="flex justify-between">
                           <span>Cenas Total</span>
                           <span>{scenes.length}</span>
                       </div>
                       <div className="flex justify-between">
                           <span>Estilo Visual</span>
                           <span>{imageStyle}</span>
                       </div>
                       <div className="flex justify-between">
                           <span>Locução</span>
                           <span>{scenes.filter(s => s.audioUrl).length}/{scenes.length} Geradas</span>
                       </div>
                       <div className="flex justify-between">
                           <span>Imagens</span>
                           <span>{scenes.filter(s => s.imageUrl).length}/{scenes.length} Geradas</span>
                       </div>
                   </div>
               </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
