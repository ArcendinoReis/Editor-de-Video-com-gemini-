import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Type, Download, Loader2, Package } from 'lucide-react';
import { Scene, SubtitleStyle } from '../types';
import JSZip from 'jszip';

interface PlayerProps {
  scenes: Scene[];
  backgroundMusicUrl: string | null;
  aspectRatio: '16:9' | '9:16';
  musicVolume: number;
  subtitleStyle: SubtitleStyle;
  showSubtitles: boolean;
  setShowSubtitles: (show: boolean) => void;
  setSubtitleStyle: (style: SubtitleStyle) => void;
}

export const Player: React.FC<PlayerProps> = ({ 
    scenes, 
    backgroundMusicUrl, 
    aspectRatio,
    musicVolume,
    subtitleStyle,
    showSubtitles,
    setShowSubtitles,
    setSubtitleStyle
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentScene = scenes[currentSceneIndex];

  // CSS for Ken Burns Effect
  const kenBurnsStyle = {
    animation: isPlaying ? 'kenBurns 10s ease-in-out infinite alternate' : 'none',
    transformOrigin: 'center center',
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes kenBurns {
        0% { transform: scale(1.0); }
        100% { transform: scale(1.15); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle sequence playback
  useEffect(() => {
    const audio = audioRef.current;
    const music = musicRef.current;

    const handleEnded = () => {
        if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
            setCurrentSceneIndex(0);
            if (music) music.pause();
        }
    };

    if (audio) {
        audio.addEventListener('ended', handleEnded);
    }

    return () => {
        if (audio) {
            audio.removeEventListener('ended', handleEnded);
        }
    };
  }, [scenes.length, currentSceneIndex]);

  // Auto-play and Volume Sync
  useEffect(() => {
    if (isPlaying && audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Playback prevented", error);
                setIsPlaying(false);
            });
        }
    }
    if (musicRef.current) {
        musicRef.current.volume = musicVolume;
    }
  }, [currentSceneIndex, isPlaying, musicVolume]);

  const togglePlay = () => {
    if (isPlaying) {
        setIsPlaying(false);
        audioRef.current?.pause();
        musicRef.current?.pause();
    } else {
        setIsPlaying(true);
        audioRef.current?.play();
        if (musicRef.current && backgroundMusicUrl) {
            if (musicRef.current.paused) {
                musicRef.current.currentTime = 0;
                musicRef.current.volume = musicVolume;
                musicRef.current.play().catch(console.error);
            }
        }
    }
  };

  // -- Improved Export Logic (WebAudio Mixing + Ken Burns) --
  const handleExportVideo = async () => {
    if (scenes.length === 0) return;
    setIsExporting(true);
    setIsPlaying(false); 
    const originalTitle = document.title;
    document.title = "Renderizando...";

    try {
        const canvas = canvasRef.current;
        if(!canvas) throw new Error("No canvas");
        const ctx = canvas.getContext('2d', { alpha: false });
        if(!ctx) throw new Error("No context");

        // 1. Setup Web Audio API
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const actx = new AudioContextClass();
        const dest = actx.createMediaStreamDestination();
        const musicGain = actx.createGain();
        musicGain.gain.value = musicVolume;
        musicGain.connect(dest);

        // 2. Load Background Music
        let musicBuffer: AudioBuffer | null = null;
        if (backgroundMusicUrl) {
            try {
                const resp = await fetch(backgroundMusicUrl);
                const ab = await resp.arrayBuffer();
                musicBuffer = await actx.decodeAudioData(ab);
            } catch (e) {
                console.warn("Failed to load background music for export", e);
            }
        }

        // 3. Start Background Music Loop
        let musicSource: AudioBufferSourceNode | null = null;
        if (musicBuffer) {
            musicSource = actx.createBufferSource();
            musicSource.buffer = musicBuffer;
            musicSource.loop = true;
            musicSource.connect(musicGain);
            musicSource.start(0);
        }

        // 4. Prepare Video Recorder
        const canvasStream = canvas.captureStream(30); // 30 FPS
        // Combine the Canvas Video Stream with the Audio Destination Stream
        const combinedTracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
        const combinedStream = new MediaStream(combinedTracks);
        
        const recorder = new MediaRecorder(combinedStream, { 
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 8000000 // 8Mbps High Quality
        });
        
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => { if(e.data.size > 0) chunks.push(e.data); };
        
        const recordingPromise = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
        });

        recorder.start();

        // 5. Process Scenes
        for (const scene of scenes) {
            // A. Load Image
            let img: HTMLImageElement | null = null;
            if (scene.imageUrl) {
                img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise((resolve) => {
                    img!.onload = resolve;
                    img!.onerror = resolve;
                    img!.src = scene.imageUrl!;
                });
            }

            // B. Load Audio & Determine Duration
            let durationMs = 3000; // Default 3s
            if (scene.audioUrl) {
                try {
                    const resp = await fetch(scene.audioUrl);
                    const ab = await resp.arrayBuffer();
                    const audioBuffer = await actx.decodeAudioData(ab);
                    durationMs = audioBuffer.duration * 1000;
                    
                    // Play scene audio to the destination
                    const source = actx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(dest);
                    source.start(actx.currentTime);
                } catch(e) {
                    console.warn("Failed to load scene audio", e);
                }
            }
            
            // Add a small buffer for transition feel
            durationMs += 500;

            // C. Animation Loop (Ken Burns)
            const startTime = Date.now();
            const fps = 30;
            const frameInterval = 1000 / fps;
            
            let loopTime = 0;
            while (loopTime < durationMs) {
                const loopStart = Date.now();

                // -- Ken Burns Math --
                // Zoom from 1.0 to 1.15 over the duration of the scene
                const progress = loopTime / durationMs;
                const scale = 1.0 + (0.15 * progress);
                
                // Clear
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (img) {
                    // Draw scaled image centered
                    // We simulate zoom by drawing a larger source rectangle or scaling the context
                    const w = canvas.width;
                    const h = canvas.height;
                    
                    // Calculate scaling to cover canvas (object-cover)
                    const imgRatio = img.width / img.height;
                    const canvasRatio = w / h;
                    
                    let drawW, drawH;
                    if (imgRatio > canvasRatio) {
                        drawH = h;
                        drawW = h * imgRatio;
                    } else {
                        drawW = w;
                        drawH = w / imgRatio;
                    }
                    
                    // Center offset
                    const offsetX = (w - drawW) / 2;
                    const offsetY = (h - drawH) / 2;

                    ctx.save();
                    ctx.translate(w/2, h/2);
                    ctx.scale(scale, scale);
                    ctx.translate(-w/2, -h/2);
                    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
                    ctx.restore();
                }

                // -- Draw Subtitles --
                if (showSubtitles && scene.narration) {
                    ctx.font = "bold 48px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    
                    // Shadow
                    ctx.shadowColor = "rgba(0,0,0,0.8)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;

                    const text = scene.narration;
                    const maxWidth = canvas.width * 0.8;
                    const x = canvas.width / 2;
                    const y = canvas.height - 100;
                    
                    // Word Wrap
                    const words = text.split(' ');
                    let line = '';
                    const lines = [];
                    
                    for(let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && n > 0) {
                            lines.push(line);
                            line = words[n] + ' ';
                        } else {
                            line = testLine;
                        }
                    }
                    lines.push(line);

                    // Render Text
                    lines.forEach((line, i) => {
                        const lineY = y - ((lines.length - 1 - i) * 60);
                        
                        // Draw Box for Modern Style (Optional, simplifying for canvas)
                        if (subtitleStyle === SubtitleStyle.MODERN) {
                             const textWidth = ctx.measureText(line).width;
                             ctx.fillStyle = "rgba(0,0,0,0.6)";
                             ctx.fillRect(x - textWidth/2 - 10, lineY - 48, textWidth + 20, 60);
                        }

                        ctx.fillStyle = subtitleStyle === SubtitleStyle.CLASSIC ? '#FFD700' : '#ffffff';
                        ctx.fillText(line, x, lineY);
                    });
                    
                    // Reset shadow
                    ctx.shadowColor = "transparent";
                }

                // Wait for next frame
                const elapsed = Date.now() - loopStart;
                const delay = Math.max(0, frameInterval - elapsed);
                await new Promise(r => setTimeout(r, delay));
                
                loopTime = Date.now() - startTime;
            }
        }

        // 6. Finish
        musicSource?.stop();
        recorder.stop();
        await recordingPromise;
        actx.close();

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${Date.now()}.webm`;
        a.click();
        
    } catch (e) {
        console.error("Export failed", e);
        alert("Erro ao exportar vídeo. Tente a opção 'Baixar Assets' se o problema persistir.");
    } finally {
        setIsExporting(false);
        document.title = originalTitle;
    }
  };

  const handleDownloadZip = async () => {
    if (scenes.length === 0) return;
    setIsZipping(true);

    try {
        const zip = new JSZip();
        const mediaFolder = zip.folder("media");
        const scriptFolder = zip.folder("script");

        // Add Script
        const scriptContent = scenes.map((s, i) => 
            `Scene ${i+1}:\nNarration: ${s.narration}\nVisual Prompt: ${s.visualPrompt}\n`
        ).join('\n---\n');
        scriptFolder?.file("script.txt", scriptContent);

        // Add Media
        await Promise.all(scenes.map(async (scene, i) => {
            const index = (i + 1).toString().padStart(2, '0');
            
            // Add Image
            if (scene.imageUrl) {
                const base64Data = scene.imageUrl.split(',')[1];
                if (base64Data) {
                    mediaFolder?.file(`scene_${index}.jpg`, base64Data, {base64: true});
                }
            }

            // Add Audio
            if (scene.audioUrl) {
                try {
                    const response = await fetch(scene.audioUrl);
                    const blob = await response.blob();
                    mediaFolder?.file(`scene_${index}.wav`, blob);
                } catch (e) {
                    console.error("Failed to add audio to zip", e);
                }
            }
        }));

        // Generate Zip
        const content = await zip.generateAsync({type: "blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "projeto_video_ia_assets.zip";
        a.click();

    } catch (e) {
        console.error("Zip failed", e);
        alert("Erro ao criar arquivo ZIP.");
    } finally {
        setIsZipping(false);
    }
  };


  const aspectRatioClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] h-[600px]';

  // Subtitle Styling
  const getSubtitleClasses = (style: SubtitleStyle) => {
      switch(style) {
          case SubtitleStyle.MODERN: return "bg-black/70 text-white px-6 py-3 rounded-xl font-sans font-medium backdrop-blur-sm shadow-xl";
          case SubtitleStyle.CLASSIC: return "text-yellow-400 font-bold font-serif text-shadow-outline px-4 py-2 drop-shadow-md tracking-wide"; 
          case SubtitleStyle.MINIMAL: return "text-white/90 font-light tracking-wider bg-black/20 px-4 py-2 rounded";
          case SubtitleStyle.KARAOKE: return "bg-white text-purple-600 px-6 py-3 font-bold rounded-full shadow-lg border-2 border-purple-600";
          default: return "bg-black/60 text-white px-4 py-2 rounded-lg";
      }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto sticky top-6">
      {/* Video Viewport */}
      <div className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${aspectRatioClass} flex items-center justify-center group ring-1 ring-white/10`}>
        
        {/* Main Image with Ken Burns Effect */}
        {currentScene?.imageUrl ? (
            <div className="w-full h-full overflow-hidden">
                <img 
                    key={currentScene.imageUrl} // Key change triggers animation reset
                    src={currentScene.imageUrl} 
                    alt="Scene visual" 
                    style={kenBurnsStyle}
                    className={`w-full h-full object-cover animate-fade-in origin-center`}
                />
            </div>
        ) : (
          <div className="text-gray-500 flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 border-2 border-gray-700 border-dashed rounded mb-2" />
            <span>Gerando Visual...</span>
          </div>
        )}

        {/* Hidden Canvas for Export */}
        <canvas ref={canvasRef} className="hidden" width={aspectRatio === '16:9' ? 1920 : 1080} height={aspectRatio === '16:9' ? 1080 : 1920} />

        {/* Subtitles Overlay */}
        {showSubtitles && currentScene?.narration && (
            <div className={`absolute bottom-12 left-8 right-8 text-center animate-fade-in z-10`}>
                <p className={`inline-block text-xl md:text-2xl max-w-full leading-relaxed ${getSubtitleClasses(subtitleStyle)}`}>
                    {currentScene.narration}
                </p>
            </div>
        )}

        {/* Controls Overlay (Hover) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
           <button 
             onClick={togglePlay}
             className="bg-white/20 backdrop-blur-md hover:bg-white/40 p-6 rounded-full text-white transition-all transform hover:scale-110 pointer-events-auto"
           >
             {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2"/>}
           </button>
        </div>
      </div>

      {/* Hidden Audio Elements */}
      <audio ref={audioRef} src={currentScene?.audioUrl} className="hidden"/>
      <audio ref={musicRef} src={backgroundMusicUrl || undefined} loop className="hidden"/>

      {/* Controls Bar */}
      <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        
        {/* Progress */}
        <div className="flex gap-1 h-1.5 w-full mb-4">
            {scenes.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`flex-1 rounded-full transition-colors duration-300 ${idx <= currentSceneIndex ? 'bg-purple-600' : 'bg-gray-200'}`} 
                />
            ))}
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
            
            {/* Subtitle Controls */}
            <div className="flex items-center gap-2 relative group/subs">
                <button 
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className={`p-2 rounded-lg transition-colors ${showSubtitles ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="Legendas"
                >
                    <Type size={20} />
                </button>
                
                {/* Subtitle Style Menu (Hover) */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/subs:block bg-white border border-gray-200 shadow-lg rounded-lg p-2 w-40 z-30">
                    <p className="text-xs font-semibold text-gray-400 mb-2 px-2">Estilo Legenda</p>
                    {Object.values(SubtitleStyle).map(style => (
                        <button
                            key={style}
                            onClick={() => setSubtitleStyle(style)}
                            className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50 ${subtitleStyle === style ? 'text-purple-600 font-medium' : 'text-gray-600'}`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-6">
                <button className="text-gray-400 hover:text-gray-800 disabled:opacity-30" onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))} disabled={currentSceneIndex === 0}>
                    <SkipBack size={24} />
                </button>
                <button 
                    onClick={togglePlay}
                    className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 shadow-lg active:scale-95 transition-transform"
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1"/>}
                </button>
                <button className="text-gray-400 hover:text-gray-800 disabled:opacity-30" onClick={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))} disabled={currentSceneIndex === scenes.length - 1}>
                    <SkipForward size={24} />
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDownloadZip}
                    disabled={isZipping || scenes.length === 0}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200
                        ${isZipping ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}
                    `}
                    title="Baixar imagens e áudios para edição externa"
                >
                    {isZipping ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    <span className="hidden sm:inline">Baixar Assets</span>
                </button>

                <button 
                    onClick={handleExportVideo}
                    disabled={isExporting || scenes.length === 0}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isExporting ? 'bg-gray-100 text-gray-400' : 'bg-black text-white hover:bg-gray-800'}
                    `}
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span>Baixar Vídeo</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};