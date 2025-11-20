import React, { useState } from 'react';
import { Wand2, Loader2, Clock, PenTool, Sparkles } from 'lucide-react';
import { generateScript, formatScript } from '../services/gemini';

interface ScriptViewProps {
  onGenerate: (scenes: any[]) => void;
  isProcessing: boolean;
  setProcessing: (val: boolean) => void;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ onGenerate, isProcessing, setProcessing }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState('');
  const [manualText, setManualText] = useState('');
  const [duration, setDuration] = useState<number>(1); // Default 1 minute

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setProcessing(true);
    try {
      const generatedScenes = await generateScript(topic, duration);
      processScenes(generatedScenes);
    } catch (e) {
      alert("Failed to generate script. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    setProcessing(true);
    try {
        const formattedScenes = await formatScript(manualText);
        processScenes(formattedScenes);
    } catch (e) {
        alert("Failed to format script. Please try again.");
    } finally {
        setProcessing(false);
    }
  };

  const processScenes = (scenes: any[]) => {
      const scenesWithIds = scenes.map((s: any) => ({
        ...s,
        id: crypto.randomUUID(),
        imageUrl: undefined,
        audioUrl: undefined
      }));
      onGenerate(scenesWithIds);
  };

  const presets = [1, 3, 5, 10];

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Crie seu Roteiro</h2>
        
        {/* Mode Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-8 w-fit">
            <button
                onClick={() => setMode('ai')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${mode === 'ai' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Sparkles size={16} />
                Gerar com IA
            </button>
            <button
                onClick={() => setMode('manual')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${mode === 'manual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <PenTool size={16} />
                Digitar Manualmente
            </button>
        </div>

        {mode === 'ai' ? (
            <div className="space-y-8 animate-fade-in">
                <p className="text-gray-500">Digite um tópico e defina a duração para gerar automaticamente um roteiro dividido em cenas.</p>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tópico do Vídeo *</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: A história do vinho, Curiosidades sobre o espaço..."
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Clock size={16} />
                        Duração Estimada (minutos)
                    </label>
                    
                    <div className="flex items-center gap-3 mb-3">
                        {presets.map(min => (
                            <button
                                key={min}
                                onClick={() => setDuration(min)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${duration === min 
                                        ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm' 
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}
                                `}
                            >
                                {min} min
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Personalizado:</span>
                        <input 
                            type="number" 
                            min="1" 
                            max="30"
                            value={duration}
                            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 p-2 bg-white border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <span className="text-sm text-gray-400">minutos (~{Math.ceil(duration * 6)} cenas)</span>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isProcessing || !topic}
                        className={`
                            w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white font-semibold shadow-lg
                            transition-all transform hover:scale-[1.02] active:scale-95
                            ${isProcessing || !topic ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}
                        `}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Escrevendo Roteiro...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 size={20} />
                                <span>Gerar Roteiro com IA</span>
                            </>
                        )}
                    </button>
                </div>
                
                <div className="mt-8 p-6 bg-purple-50 rounded-2xl border border-purple-100">
                    <h3 className="text-purple-900 font-semibold mb-2">Dica Pro</h3>
                    <p className="text-purple-700 text-sm">
                        A duração define quantas cenas serão criadas. 1 minuto gera aproximadamente 6 cenas curtas.
                    </p>
                </div>
            </div>
        ) : (
            <div className="space-y-8 animate-fade-in">
                <p className="text-gray-500">Cole seu roteiro completo abaixo. A IA irá analisá-lo, dividi-lo em cenas e sugerir as imagens automaticamente.</p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seu Roteiro *</label>
                    <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Cole seu texto aqui..."
                        className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                    />
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleManualSubmit}
                        disabled={isProcessing || !manualText}
                        className={`
                            w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white font-semibold shadow-lg
                            transition-all transform hover:scale-[1.02] active:scale-95
                            ${isProcessing || !manualText ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}
                        `}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Processando Texto...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 size={20} />
                                <span>Converter em Cenas</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};