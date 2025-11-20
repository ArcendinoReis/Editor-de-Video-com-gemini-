import React, { useState } from 'react';
import { Scene, ImageStyle } from '../types';
import { RefreshCw, Play, Image as ImageIcon, Mic, Wand2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { generateImage, generateSpeech } from '../services/gemini';

interface ScenesViewProps {
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  selectedVoice: string;
  aspectRatio: '16:9' | '9:16';
  imageStyle: ImageStyle;
  setImageStyle: (style: ImageStyle) => void;
}

export const ScenesView: React.FC<ScenesViewProps> = ({ 
    scenes, 
    setScenes, 
    selectedVoice, 
    aspectRatio,
    imageStyle,
    setImageStyle
}) => {
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleGenerateImage = async (scene: Scene) => {
    // Prevent double submission
    if (scene.isGeneratingImage) return;
    
    updateScene(scene.id, { isGeneratingImage: true, error: undefined });
    try {
        const imageUrl = await generateImage(scene.visualPrompt, aspectRatio, imageStyle);
        updateScene(scene.id, { imageUrl, isGeneratingImage: false });
    } catch (e: any) {
        updateScene(scene.id, { 
            isGeneratingImage: false, 
            error: e?.message || "Erro ao gerar imagem" 
        });
    }
  };

  const handleGenerateAudio = async (scene: Scene) => {
    // Prevent double submission
    if (scene.isGeneratingAudio) return;

    updateScene(scene.id, { isGeneratingAudio: true, error: undefined });
    try {
        const audioUrl = await generateSpeech(scene.narration, selectedVoice);
        updateScene(scene.id, { audioUrl, isGeneratingAudio: false });
    } catch (e: any) {
        updateScene(scene.id, { 
            isGeneratingAudio: false,
            error: e?.message || "Erro ao gerar áudio"
        });
    }
  };

  // Process tasks with a concurrency limit to avoid 429s
  const processQueue = async (tasks: (() => Promise<void>)[], concurrency: number) => {
    let index = 0;
    const activePromises: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      if (index >= tasks.length) return;
      
      const currentIndex = index++;
      const task = tasks[currentIndex];
      
      try {
        await task();
      } catch (e) {
        console.error("Queue task failed", e);
      }
      
      // Significant delay between tasks to be gentle on the API
      await new Promise(r => setTimeout(r, 1500)); 

      return runNext();
    };

    // Start initial batch
    const limit = Math.min(concurrency, tasks.length);
    for (let i = 0; i < limit; i++) {
      activePromises.push(runNext());
    }

    await Promise.all(activePromises);
  };

  const handleMagicGenerate = async () => {
      setIsBulkGenerating(true);
      
      const tasks: (() => Promise<void>)[] = [];

      // Re-queue items that are missing OR have errors (reinforce failures)
      scenes.forEach(scene => {
          const needsAudio = (!scene.audioUrl && !scene.isGeneratingAudio) || (scene.error && !scene.audioUrl);
          if (needsAudio) {
              tasks.push(() => handleGenerateAudio(scene));
          }
      });
      
      scenes.forEach(scene => {
          const needsImage = (!scene.imageUrl && !scene.isGeneratingImage) || (scene.error && !scene.imageUrl);
          if (needsImage) {
              tasks.push(() => handleGenerateImage(scene));
          }
      });

      // Reduced concurrency to 2 to drastically reduce 429 errors
      await processQueue(tasks, 2);
      
      setIsBulkGenerating(false);
  };

  const hasErrors = scenes.some(s => s.error);

  return (
    <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Editor de Cenas</h2>
                </div>
                
                <button 
                    onClick={handleMagicGenerate}
                    disabled={isBulkGenerating}
                    className={`
                        flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-medium shadow-lg transition-all
                        ${isBulkGenerating 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : hasErrors 
                                ? 'bg-red-500 hover:bg-red-600 hover:scale-105' 
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105'
                        }
                    `}
                >
                    {isBulkGenerating ? (
                        <>
                            <Loader2 size={18} className="animate-spin"/>
                            <span>Processando...</span>
                        </>
                    ) : hasErrors ? (
                        <>
                            <RefreshCw size={18} />
                            <span>Corrigir Falhas</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            <span>Gerar Tudo (Magic)</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Estilo Visual:</span>
                    <select 
                        value={imageStyle}
                        onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                        className="bg-gray-100 border-transparent rounded-lg py-1.5 px-3 text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                    >
                        {Object.values(ImageStyle).map(style => (
                            <option key={style} value={style}>{style}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {scenes.map((scene, index) => (
                <div key={scene.id} className={`bg-white rounded-xl shadow-sm border p-4 flex gap-6 group hover:shadow-md transition-shadow ${scene.error ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}>
                    {/* Scene Number */}
                    <div className="text-xs font-bold text-gray-300 pt-1 w-6">
                        {(index + 1).toString().padStart(2, '0')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                        {/* Script Text */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Locução</label>
                            <textarea
                                className="w-full text-sm text-gray-700 border-none focus:ring-0 p-0 resize-none bg-transparent"
                                rows={2}
                                value={scene.narration}
                                onChange={(e) => updateScene(scene.id, { narration: e.target.value })}
                            />
                            {/* Audio Control */}
                            <div className="mt-2 flex items-center gap-2">
                                {scene.audioUrl ? (
                                    <button 
                                        onClick={() => new Audio(scene.audioUrl).play()}
                                        className="flex items-center gap-2 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100"
                                    >
                                        <Play size={12} fill="currentColor" /> Ouvir
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleGenerateAudio(scene)}
                                        disabled={scene.isGeneratingAudio}
                                        className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-colors
                                            ${scene.error && !scene.isGeneratingAudio ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}
                                        `}
                                    >
                                        {scene.isGeneratingAudio ? <Loader2 size={12} className="animate-spin"/> : <Mic size={12} />}
                                        {scene.error && !scene.isGeneratingAudio ? 'Tentar Novamente' : 'Gerar Voz'}
                                    </button>
                                )}
                            </div>
                        </div>

                         {/* Visual Prompt */}
                         <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Prompt Visual</label>
                            <p className="text-xs text-gray-500 italic line-clamp-2">{scene.visualPrompt}</p>
                         </div>
                         
                         {/* Error Message */}
                         {scene.error && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-100">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                <span>{scene.error}</span>
                            </div>
                         )}
                    </div>

                    {/* Media Preview */}
                    <div className="w-48 flex-shrink-0 flex flex-col gap-2">
                        <div className={`relative aspect-video bg-gray-100 rounded-lg overflow-hidden border group/image ${scene.error && !scene.imageUrl ? 'border-red-300' : 'border-gray-200'}`}>
                            {scene.imageUrl ? (
                                <img src={scene.imageUrl} alt="Scene" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    {scene.isGeneratingImage ? <Loader2 className="animate-spin text-purple-500" /> : <ImageIcon size={24} />}
                                </div>
                            )}
                            
                            {/* Hover Actions for Image */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => handleGenerateImage(scene)}
                                    disabled={scene.isGeneratingImage}
                                    className="p-2 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform"
                                    title="Regenerate Image"
                                >
                                    <RefreshCw size={16} className={scene.isGeneratingImage ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-1">
                             <span className="text-[10px] text-gray-400">{imageStyle}</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {scenes.length === 0 && (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhuma cena criada. Volte para "Roteiro".
                </div>
            )}
        </div>
    </div>
  );
};