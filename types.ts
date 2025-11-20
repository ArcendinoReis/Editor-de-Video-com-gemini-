export interface Scene {
  id: string;
  narration: string;
  visualPrompt: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  isGeneratingImage?: boolean;
  isGeneratingAudio?: boolean;
  error?: string; // New field for error tracking
}

export interface VideoProject {
  title: string;
  topic: string;
  scenes: Scene[];
  backgroundMusic: string | null; // URL to music file
  musicVolume: number;
  selectedVoice: string;
  aspectRatio: '16:9' | '9:16';
  imageStyle: ImageStyle;
  subtitleStyle: SubtitleStyle;
  showSubtitles: boolean;
}

export enum AppView {
  SCRIPT = 'SCRIPT',
  SCENES = 'SCENES',
  MEDIA = 'MEDIA',
  MUSIC = 'MUSIC'
}

export enum ImageStyle {
  CINEMATIC = 'Cinematic',
  ANIME = 'Anime',
  DIGITAL_ART = 'Digital Art',
  PHOTOREALISTIC = 'Photorealistic',
  WATERCOLOR = 'Watercolor',
  CYBERPUNK = 'Cyberpunk',
  COMIC_BOOK = 'Comic Book'
}

export enum SubtitleStyle {
  MODERN = 'Modern', // Clean sans-serif, bg box
  KARAOKE = 'Karaoke', // Highlighted text (simulated)
  CLASSIC = 'Classic', // Yellow text, black outline
  MINIMAL = 'Minimal' // Small white text
}

export const AVAILABLE_VOICES = [
  { name: 'Puck', gender: 'Male' },
  { name: 'Charon', gender: 'Male' },
  { name: 'Kore', gender: 'Female' },
  { name: 'Fenrir', gender: 'Male' },
  { name: 'Zephyr', gender: 'Female' }
];

export const STOCK_MUSIC = [
  { id: 'chill', name: 'Chill Lo-Fi', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'upbeat', name: 'Upbeat Pop', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d63f0a1d77.mp3' },
  { id: 'cinematic', name: 'Cinematic Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_07017d65a4.mp3' }
];