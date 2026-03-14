import { createContext, useContext, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, X } from "lucide-react";

export type Song = {
  id: number;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
};

type AudioPlayerContextType = {
  currentSong: Song | null;
  isPlaying: boolean;
  playlist: Song[];
  playSong: (song: Song, playlist?: Song[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  stopPlayback: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextType>({
  currentSong: null,
  isPlaying: false,
  playlist: [],
  playSong: () => {},
  togglePlay: () => {},
  playNext: () => {},
  playPrevious: () => {},
  stopPlayback: () => {},
});

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSong = (song: Song, newPlaylist?: Song[]) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(song.audioUrl);
    audioRef.current.play();
    audioRef.current.onended = () => {
      playNext();
    };
    
    setCurrentSong(song);
    setIsPlaying(true);
    if (newPlaylist) {
      setPlaylist(newPlaylist);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (!currentSong || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playSong(playlist[nextIndex], playlist);
  };

  const playPrevious = () => {
    if (!currentSong || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playSong(playlist[prevIndex], playlist);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentSong(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <AudioPlayerContext.Provider value={{
      currentSong,
      isPlaying,
      playlist,
      playSong,
      togglePlay,
      playNext,
      playPrevious,
      stopPlayback,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function MiniPlayer() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrevious, stopPlayback, playlist } = useAudioPlayer();
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        const audio = document.querySelector('audio');
        if (audio) {
          setCurrentTime(audio.currentTime);
          setDuration(audio.duration || 0);
          setProgress((audio.currentTime / (audio.duration || 1)) * 100);
        }
      }, 500);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!currentSong) return null;

  return (
    <div 
      className="fixed bottom-16 left-0 right-0 bg-card border-t border-border z-40 shadow-lg"
      data-testid="mini-player"
    >
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
          data-testid="player-progress"
        />
      </div>
      
      <div className="flex items-center gap-3 px-4 py-2 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
          {currentSong.coverUrl ? (
            <img src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" data-testid="player-song-title">
            {currentSong.title}
          </p>
          <p className="text-xs text-muted-foreground truncate" data-testid="player-artist">
            {currentSong.artist}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-8 h-8"
            onClick={playPrevious}
            disabled={playlist.length <= 1}
            data-testid="button-previous"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            size="icon" 
            variant="default"
            className="w-10 h-10 rounded-full"
            onClick={togglePlay}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button 
            size="icon" 
            variant="ghost"
            className="w-8 h-8"
            onClick={playNext}
            disabled={playlist.length <= 1}
            data-testid="button-next"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          
          <Button 
            size="icon" 
            variant="ghost"
            className="w-8 h-8"
            onClick={stopPlayback}
            data-testid="button-close-player"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground max-w-md mx-auto">
        <span data-testid="player-current-time">{formatTime(currentTime)}</span>
        <span data-testid="player-duration">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
