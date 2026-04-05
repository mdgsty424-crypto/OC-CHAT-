import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import MessageInteractionMenu from './MessageInteractionMenu';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  Paperclip, 
  Smile, 
  Reply, 
  Play, 
  Pause, 
  MoreVertical, 
  MapPin, 
  UserPlus, 
  BarChart2, 
  Languages, 
  Timer, 
  FileText, 
  Phone, 
  Video, 
  Loader2, 
  Clock,
  X,
  ExternalLink,
  Download,
  Share2,
  Forward,
  File,
  Trash2
} from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onCall?: (type: 'audio' | 'video') => void | Promise<void>;
  otherUserPhoto?: string;
  replyMessage?: Message;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '👎', '🔥'];

// Custom hook for long press
// (Removed as we use inline handlers now)

const LinkPreview: React.FC<{ url: string; isMe: boolean }> = ({ url, isMe }) => {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/fetch-preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch (err) {
        // Suppress link preview fetch errors to avoid console spam
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading) return null;
  if (!preview) return null;

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isFacebook = url.includes('facebook.com');
  
  let videoId = '';
  if (isYouTube) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    videoId = match ? match[1] : '';
  }

  if (showPlayer && isYouTube && videoId) {
    return (
      <div className="mt-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video relative">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowPlayer(false);
          }}
          className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 z-10"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "mt-2 rounded-3xl overflow-hidden border shadow-2xl transition-all hover:bg-opacity-95 cursor-pointer max-w-[300px] group backdrop-blur-md",
        isMe ? "bg-white/10 border-white/20 text-white" : "bg-surface/80 border-white/10 text-text"
      )} 
      onClick={() => {
        if (isYouTube || isFacebook) {
          setShowPlayer(true);
        } else {
          window.open(url, '_blank');
        }
      }}
    >
      {preview.image && !imageError ? (
        <div className="relative aspect-video bg-surface overflow-hidden">
          <img 
            src={preview.image} 
            alt={preview.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
          {(isYouTube || isFacebook) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center text-primary shadow-xl transform transition-transform group-hover:scale-110">
                <Play size={20} fill="currentColor" className="ml-1" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-video bg-surface overflow-hidden flex flex-col items-center justify-center text-muted">
          <ExternalLink size={28} className="mb-2 opacity-40" />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
            {preview.siteName || new URL(url).hostname}
          </span>
        </div>
      )}
      <div className="p-4 space-y-1 bg-inherit">
        <h4 className="text-[12px] font-extrabold line-clamp-2 leading-snug">
          {preview.title}
        </h4>
        {preview.description && (
          <p className="text-[11px] opacity-70 line-clamp-2 leading-tight">
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 opacity-50 pt-1 border-t border-current/10 mt-1">
          <span className="text-[9px] font-bold uppercase tracking-tighter">
            {preview.siteName || new URL(url).hostname}
          </span>
        </div>
      </div>
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  onReply, 
  onForward, 
  onCall,
  otherUserPhoto,
  replyMessage
}) => {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showInteractionMenu, setShowInteractionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timestamp = new Date(message.timestamp);
  const timeStr = !isNaN(timestamp.getTime()) ? format(timestamp, 'HH:mm') : '';
  
  const getFullTimestamp = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    const day = format(date, 'EEE').toUpperCase();
    const time = format(date, 'HH:mm');
    return `${day} ${time}`;
  };

  const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || isNaN(seconds)) return 'Tap to call again';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  const formatVoiceTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Self-destruct logic
  useEffect(() => {
    if (message.isSelfDestruct && message.destructTime) {
      const timer = setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'chats', message.chatId, 'messages', message.id));
        } catch (error) {
          console.error("Error self-destructing message:", error);
        }
      }, message.destructTime * 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Swipe logic
  const x = useMotionValue(0);
  const swipeThreshold = 50;
  const opacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const scale = useTransform(x, [0, swipeThreshold], [0.5, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x >= swipeThreshold && onReply) {
      onReply(message);
    }
    x.set(0);
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);

    try {
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      setShowReactions(false);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!user || !message.poll) return;
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    const newOptions = [...message.poll.options];
    const hasVoted = newOptions[optionIndex].votes.includes(user.uid);

    if (hasVoted) {
      newOptions[optionIndex].votes = newOptions[optionIndex].votes.filter(id => id !== user.uid);
    } else {
      newOptions[optionIndex].votes.push(user.uid);
    }

    try {
      await updateDoc(messageRef, { 'poll.options': newOptions });
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger on right click
    if ('button' in e && e.button !== 0) return;
    
    longPressTimer.current = setTimeout(() => {
      let clientX = 0;
      let clientY = 0;
      
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      setMenuPosition({ x: clientX, y: clientY });
      setShowActionMenu(true);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowActionMenu(true);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'chats', message.chatId, 'messages', message.id));
      setShowActionMenu(false);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
    setShowActionMenu(false);
  };

  // 1. Call History Rendering (Messenger Style)
  if (message.type === 'call_history' || message.messageType === 'call_history') {
    return (
      <div className="flex flex-col items-center w-full my-6">
        {/* Centered Timestamp */}
        <span className="text-[10px] font-bold text-muted mb-3 tracking-wider uppercase">
          {getFullTimestamp(timestamp)}
        </span>
        
        {/* Pill Bubble */}
        <div className="bg-surface px-6 py-2 rounded-full border border-border flex items-center gap-3 shadow-sm hover:opacity-80 transition-colors cursor-pointer active:scale-95">
          <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-text">
            {message.callType === 'video' ? <Video size={18} /> : <Phone size={18} />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text">
              {message.callType === 'video' ? 'Video chat' : 'Audio call'}
            </span>
            <span className="text-[10px] text-muted font-medium">
              {formatDuration(message.duration)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Regular Message Rendering
  return (
    <div className={cn(
      "flex flex-col max-w-[85%] gap-1 group relative mb-1",
      isMe ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {/* Swipe to Reply Indicator */}
      {!isMe && onReply && (
        <motion.div 
          style={{ opacity, scale }}
          className="absolute -left-10 top-1/2 -translate-y-1/2 text-primary"
        >
          <Reply size={20} />
        </motion.div>
      )}

      <div className={cn("flex items-center gap-1", isMe ? "flex-row-reverse" : "flex-row")}>
        {onForward && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onForward(message);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted hover:text-text hover:bg-surface rounded-full flex-shrink-0"
          >
            <Forward size={14} />
          </button>
        )}
        <motion.div
          drag={!isMe ? "x" : false}
          dragConstraints={{ left: 0, right: swipeThreshold }}
          dragElastic={0.1}
          style={{ x }}
          onDragEnd={handleDragEnd}
          className="relative overflow-visible"
        >
          <div
            onClick={() => setShowInteractionMenu(!showInteractionMenu)}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onContextMenu={handleContextMenu}
            className={cn(
              "relative rounded-[20px] transition-all cursor-pointer select-none active:scale-[0.98]",
              message.type === 'voice' || message.messageType === 'voice' ? "bg-transparent p-0" : (
                isMe 
                  ? "gradient-primary text-white rounded-tr-[4px] bubble-3d-lifted" 
                  : "bg-surface text-text rounded-tl-[4px] bubble-3d"
              ),
              (message.type === 'text' || message.type === 'contact') && "px-4 py-2.5"
            )}
          >
            {showInteractionMenu && (
              <MessageInteractionMenu 
                onClose={() => setShowInteractionMenu(false)}
                onEmojiClick={(emoji) => {
                  toggleReaction(emoji);
                  setShowInteractionMenu(false);
                }}
                onAction={(action) => {
                  if (action === 'delete') handleDelete();
                  if (action === 'copy') handleCopy();
                  if (action === 'reply' && onReply) onReply(message);
                  if (action === 'forward' && onForward) onForward(message);
                  setShowInteractionMenu(false);
                }}
              />
            )}
          {/* Self-destruct Indicator */}
        {message.isSelfDestruct && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
            <Timer size={10} />
          </div>
        )}

        {/* Forwarded Context */}
        {message.forwardedFrom && (
          <div className={cn(
            "flex items-center gap-1.5 mb-1 opacity-80",
            isMe ? "text-white/90" : "text-black/70"
          )}>
            <Forward size={12} />
            <span className="text-[10px] italic">Forwarded from</span>
            {message.forwardedFrom.photoURL && (
              <img src={message.forwardedFrom.photoURL} alt="" className="w-3 h-3 rounded-full object-cover" />
            )}
            <span className="text-[10px] font-bold">{message.forwardedFrom.displayName}</span>
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div className={cn(
            "mb-2 p-2.5 rounded-xl text-[10px] border-l-2 relative overflow-hidden",
            isMe ? "bg-white/10 border-white/40" : "bg-black/5 border-primary/40"
          )}>
            <div className="absolute inset-0 bg-current opacity-[0.03]" />
            <p className="font-black opacity-60 uppercase tracking-tighter mb-0.5">
              {replyMessage?.senderId === user?.uid ? 'You' : (replyMessage?.senderId === message.senderId ? 'Themselves' : 'Message')}
            </p>
            <p className="truncate opacity-90 font-medium">
              {replyMessage ? (replyMessage.text || (replyMessage.type === 'image' || replyMessage.fileType === 'image' ? 'Photo' : replyMessage.type === 'video' || replyMessage.fileType === 'video' ? 'Video' : replyMessage.type === 'voice' || replyMessage.messageType === 'voice' ? 'Voice Message' : 'Attachment')) : 'Original message...'}
            </p>
          </div>
        )}

        {/* Text Message */}
        {message.type === 'text' && (
          <div className="space-y-1">
            <p className="text-[14px] leading-tight font-extrabold">
              {showTranslation ? message.translatedText : message.text}
            </p>
            {/* Link Previews */}
            {!showTranslation && message.text.match(/(https?:\/\/[^\s]+)/g)?.map((url, idx) => (
              <LinkPreview key={idx} url={url} isMe={isMe} />
            ))}
            {message.translatedText && (
              <button 
                onClick={() => setShowTranslation(!showTranslation)}
                className={cn("text-[10px] font-bold flex items-center gap-1 mt-1", isMe ? "text-white/70" : "text-primary")}
              >
                <Languages size={12} />
                {showTranslation ? "Original" : "Translate"}
              </button>
            )}
          </div>
        )}
        
        {/* Image Message */}
        {(message.type === 'image' || message.fileType === 'image') && (
          <div 
            className={cn(
              "rounded-[12px] overflow-hidden border border-border shadow-sm min-w-[200px] max-w-[280px] bg-surface cursor-pointer",
              "aspect-[16/9]"
            )}
            onClick={() => {
              if (message.status !== 'uploading' && message.status !== 'failed') {
                setShowMediaViewer(true);
              }
            }}
          >
            {message.status === 'uploading' ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-[#0084ff]" size={32} />
              </div>
            ) : message.status === 'failed' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-500 gap-1">
                <X size={24} />
                <span className="text-[10px] font-bold uppercase">Failed to upload</span>
              </div>
            ) : (
              <img 
                src={message.fileUrl || message.mediaUrl} 
                alt="Sent image" 
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        )}

        {/* Video Message */}
        {(message.type === 'video' || message.fileType === 'video') && (
          <div 
            className={cn(
              "rounded-[12px] overflow-hidden border border-border shadow-sm min-w-[200px] max-w-[280px] bg-surface cursor-pointer relative group",
              "aspect-[16/9]"
            )}
            onClick={(e) => {
              // Prevent opening viewer if they click the native controls
              // But since we want the viewer to open, maybe we should disable native controls in the bubble
              // and only show them in the viewer.
              if (message.status !== 'uploading' && message.status !== 'failed') {
                e.preventDefault();
                setShowMediaViewer(true);
              }
            }}
          >
            {message.status === 'uploading' ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-[#0084ff]" size={32} />
              </div>
            ) : message.status === 'failed' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-500 gap-1">
                <X size={24} />
                <span className="text-[10px] font-bold uppercase">Failed to upload</span>
              </div>
            ) : (message.fileUrl || message.mediaUrl) ? (
              <>
                <video 
                  src={message.fileUrl || message.mediaUrl} 
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-[#0084ff] shadow-lg">
                    <Play size={24} fill="currentColor" className="ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Video size={32} />
              </div>
            )}
          </div>
        )}

        {/* Voice Message */}
        {(message.type === 'voice' || message.messageType === 'voice') && (
          <div className={cn(
            "w-[240px] p-3 rounded-[24px] shadow-sm",
            isMe ? "bg-primary text-white" : "bg-surface text-text"
          )}>
            {message.status === 'uploading' ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (audioRef.current) {
                      if (isPlaying) {
                        audioRef.current.pause();
                      } else {
                        const playPromise = audioRef.current.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(error => {
                            console.error("Audio play failed:", error);
                          });
                        }
                      }
                    }
                  }}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-transform active:scale-90 flex-shrink-0",
                    isMe ? "bg-background text-primary" : "bg-primary text-white"
                  )}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                
                {/* Static Waveform */}
                <div className="flex-1 flex items-center gap-[2px] h-6">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-[2px] rounded-full",
                        isMe ? "bg-white/40" : "bg-black/20"
                      )}
                      style={{ height: `${20 + Math.random() * 80}%` }}
                    ></div>
                  ))}
                </div>

                <span className="text-[10px] font-bold opacity-70 flex-shrink-0">
                  {audioError ? 'Format Error' : (message.audioDuration ? formatVoiceTime(message.audioDuration) : '0:00')}
                </span>

                {/* Hidden standard audio element for reliability */}
                {message.audioUrl && (
                  <audio 
                    ref={audioRef}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => {
                      // Suppress error logging for old raw audio files to avoid console spam
                      // Fallback: try to fetch as blob and play if it's a raw Cloudinary URL
                      if (message.audioUrl && message.audioUrl.includes('/raw/upload/') && !audioRef.current?.dataset.fallbackAttempted) {
                        if (audioRef.current) {
                          audioRef.current.dataset.fallbackAttempted = 'true';
                        }
                        fetch(message.audioUrl)
                          .then(res => {
                            if (!res.ok) throw new Error('Network response was not ok');
                            return res.blob();
                          })
                          .then(blob => {
                            // Use the blob's actual type instead of hardcoding webm
                            const blobUrl = URL.createObjectURL(new Blob([blob], { type: blob.type || 'audio/mp4' }));
                            if (audioRef.current) {
                              audioRef.current.src = blobUrl;
                              audioRef.current.load();
                              audioRef.current.play().catch(e => {
                                setAudioError(true);
                                setIsPlaying(false);
                              });
                            }
                          })
                          .catch(e => {
                            setAudioError(true);
                            setIsPlaying(false);
                          });
                        return;
                      }
                      setAudioError(true);
                      setIsPlaying(false);
                    }}
                    className="hidden"
                  >
                    <source src={message.audioUrl} type="audio/webm" />
                    <source src={message.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            )}
          </div>
        )}

        {/* Location Message */}
        {message.type === 'location' && (
          <div className="space-y-3 min-w-[240px] max-w-[300px]">
            {message.location ? (
              <>
                <div className="rounded-[12px] overflow-hidden border border-border shadow-sm bg-surface">
                  <iframe
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: '12px' }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${message.location.latitude},${message.location.longitude}&z=15&output=embed`}
                  ></iframe>
                </div>
                <a 
                  href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                    isMe ? "bg-background text-primary" : "bg-primary text-white"
                  )}
                >
                  <MapPin size={14} />
                  Open in Google Maps
                </a>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span className="text-sm font-medium underline cursor-pointer">View Location</span>
              </div>
            )}
          </div>
        )}

        {/* Poll Message */}
        {message.type === 'poll' && message.poll && (
          <div className="space-y-3 min-w-[220px]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className={isMe ? "text-white" : "text-primary"} />
              <h4 className="text-[13px] font-bold">{message.poll.question}</h4>
            </div>
            <div className="space-y-2">
              {message.poll.options.map((opt, i) => {
                const totalVotes = message.poll?.options.reduce((acc, curr) => acc + curr.votes.length, 0) || 1;
                const percentage = (opt.votes.length / totalVotes) * 100;
                const hasVoted = opt.votes.includes(user?.uid || '');
                return (
                  <button 
                    key={i}
                    onClick={() => handleVote(i)}
                    className={cn(
                      "w-full text-left relative p-2 rounded-xl transition-all overflow-hidden border",
                      isMe ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"
                    )}
                  >
                    <div 
                      className="absolute inset-0 bg-primary/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="relative flex justify-between items-center text-[11px]">
                      <span className={cn("font-semibold", hasVoted && "text-primary")}>{opt.text}</span>
                      <span className="opacity-70">{opt.votes.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Message */}
        {message.type === 'contact' && message.contact && (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">{message.contact.name}</span>
              <span className="text-[10px] opacity-70">{message.contact.phone}</span>
            </div>
          </div>
        )}

        {/* File Message */}
        {message.type === 'file' && message.fileType !== 'image' && message.fileType !== 'video' && (
          <a 
            href={message.fileUrl} 
            download={message.fileName || 'document'}
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-colors min-w-[200px] max-w-[280px]",
              isMe ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
            )}
            onClick={(e) => {
              // Force download if possible
              if (message.fileUrl) {
                e.preventDefault();
                const link = document.createElement('a');
                link.href = message.fileUrl;
                // Add download attribute to force download instead of opening in browser
                link.setAttribute('download', message.fileName || 'document');
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              isMe ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
            )}>
              <File size={20} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate">{message.fileName || 'Document'}</span>
              <span className="text-[10px] opacity-70 uppercase">
                {message.fileType === 'application/pdf' ? 'PDF' : 
                 message.fileType?.includes('word') ? 'DOC' : 
                 message.fileType || 'FILE'}
              </span>
            </div>
            <div className="ml-auto pl-2">
              <Download size={16} className="opacity-70" />
            </div>
          </a>
        )}

        {/* Reactions Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn(
            "absolute -bottom-4 flex gap-1",
            isMe ? "right-2" : "left-2"
          )}>
            {Object.entries(message.reactions).map(([emoji, users]) => {
              const userList = users as string[];
              return userList.length > 0 && (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="bg-surface border border-border rounded-full px-2 py-0.5 text-[10px] shadow-sm hover:scale-110 transition-transform flex items-center gap-1"
                >
                  <span>{emoji}</span>
                  <span className="font-bold text-muted">{userList.length}</span>
                </button>
              );
            })}
          </div>
        )}
        </div>
      </motion.div>
      {isMe && onForward && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onForward(message);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted hover:text-text hover:bg-surface rounded-full"
        >
          <Forward size={16} />
        </button>
      )}
      </div>

      {/* Status & Time */}
      <div className={cn(
        "flex items-center gap-1 mt-1 px-1",
        isMe ? "justify-end" : "justify-start"
      )}>
        <span className="text-[9px] font-medium text-muted uppercase">{timeStr}</span>
        {isMe && (
          <div className="flex items-center ml-1">
            {message.status === 'seen' ? (
              otherUserPhoto ? (
                <img 
                  src={otherUserPhoto} 
                  alt="Seen" 
                  className="w-3 h-3 rounded-full object-cover border border-surface shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CheckCheck size={12} className="text-primary" />
              )
            ) : message.status === 'delivered' ? (
              <CheckCheck size={12} className="text-muted/40" />
            ) : message.status === 'pending' ? (
              <Clock size={10} className="text-muted/40 animate-pulse" />
            ) : (
              <Check size={12} className="text-muted/40" />
            )}
          </div>
        )}
      </div>

      {/* Reaction Picker Trigger */}
      <button 
        onClick={() => setShowReactions(!showReactions)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 p-1.5 bg-surface border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10",
          isMe ? "-left-10" : "-right-10"
        )}
      >
        <Smile size={14} className="text-muted" />
      </button>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className={cn(
              "absolute -top-12 z-20 bg-surface border border-border rounded-full p-1.5 flex gap-1 shadow-lg",
              isMe ? "right-0" : "left-0"
            )}
          >
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="hover:scale-125 transition-transform p-1 text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Menu Modal */}
      <AnimatePresence>
        {showActionMenu && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowActionMenu(false)}
            />
            
            <div 
              className="relative z-10 flex flex-col gap-3 pointer-events-none w-full max-w-[240px]"
              style={{
                position: 'fixed',
                top: Math.min(menuPosition.y - 100, window.innerHeight - 400),
                left: Math.min(Math.max(20, menuPosition.x - 120), window.innerWidth - 260)
              }}
            >
              {/* Emoji Reactions Pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="bg-surface rounded-full shadow-2xl border border-border p-1.5 flex justify-between items-center pointer-events-auto"
              >
                {EMOJIS.map((emoji, index) => (
                  <motion.button
                    key={emoji}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      toggleReaction(emoji);
                      setShowActionMenu(false);
                    }}
                    className="text-2xl hover:scale-150 active:scale-95 transition-transform p-1 rounded-full hover:bg-background"
                  >
                    {emoji}
                  </motion.button>
                ))}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReaction('💯');
                    setShowActionMenu(false);
                  }}
                  className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:opacity-80 transition-colors ml-1"
                >
                  <span className="text-muted font-bold">+</span>
                </button>
              </motion.div>

              {/* Context Menu List */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-surface rounded-2xl shadow-2xl border border-border p-1.5 min-w-[200px] flex flex-col gap-0.5 pointer-events-auto overflow-hidden"
              >
                {onReply && (
                  <button 
                    onClick={() => {
                      onReply(message);
                      setShowActionMenu(false);
                    }}
                    className="flex items-center justify-between p-3 hover:bg-background rounded-xl transition-colors text-sm font-medium text-text"
                  >
                    <span>Reply</span>
                    <Reply size={18} className="text-muted" />
                  </button>
                )}

                {message.type === 'text' && (
                  <button 
                    onClick={handleCopy}
                    className="flex items-center justify-between p-3 hover:bg-background rounded-xl transition-colors text-sm font-medium text-text"
                  >
                    <span>Copy</span>
                    <FileText size={18} className="text-muted" />
                  </button>
                )}

                {onForward && (
                  <button 
                    onClick={() => {
                      onForward(message);
                      setShowActionMenu(false);
                    }}
                    className="flex items-center justify-between p-3 hover:bg-background rounded-xl transition-colors text-sm font-medium text-text"
                  >
                    <span>Forward</span>
                    <Forward size={18} className="text-muted" />
                  </button>
                )}

                <div className="h-[1px] bg-border my-1 mx-2" />

                <button 
                  onClick={handleDelete}
                  className="flex items-center justify-between p-3 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium text-red-600"
                >
                  <span>Delete</span>
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </motion.div>
            </div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* Media Viewer Modal */}
      {showMediaViewer && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
            <button 
              onClick={() => setShowMediaViewer(false)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const url = message.fileUrl || message.mediaUrl;
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = message.fileName || 'media';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Download"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={async () => {
                  const url = message.fileUrl || message.mediaUrl;
                  if (url && navigator.share) {
                    try {
                      await navigator.share({
                        title: 'Shared Media',
                        url: url
                      });
                    } catch (err: any) {
                      if (err.name !== 'AbortError') {
                        console.error("Error sharing:", err);
                      }
                    }
                  } else {
                    alert("Sharing is not supported on this device.");
                  }
                }}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Share"
              >
                <Share2 size={20} />
              </button>
              {onForward && (
                <button 
                  onClick={() => {
                    setShowMediaViewer(false);
                    onForward(message);
                  }}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Forward"
                >
                  <Forward size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Media Content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {(message.type === 'image' || message.fileType === 'image') ? (
              <img 
                src={message.fileUrl || message.mediaUrl} 
                alt="Full screen media" 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (message.type === 'video' || message.fileType === 'video') ? (
              <video 
                src={message.fileUrl || message.mediaUrl} 
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MessageBubble;
