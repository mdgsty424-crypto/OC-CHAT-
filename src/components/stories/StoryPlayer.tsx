import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot, getDoc } from 'firebase/firestore';
import { Story, User } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface StoryPlayerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export default function StoryPlayer({ stories, initialIndex = 0, onClose }: StoryPlayerProps) {
  const { user: currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [storyData, setStoryData] = useState<Story | null>(null);
  const [uploader, setUploader] = useState<User | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory) return;

    // Real-time updates for the current story
    const unsub = onSnapshot(doc(db, 'stories', currentStory.id), (doc) => {
      if (doc.exists()) {
        setStoryData({ id: doc.id, ...doc.data() } as Story);
      }
    });

    // Fetch uploader info
    const fetchUploader = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentStory.userId));
      if (userDoc.exists()) {
        setUploader(userDoc.data() as User);
      }
    };
    fetchUploader();

    // Increment view count
    const incrementView = async () => {
      try {
        await updateDoc(doc(db, 'stories', currentStory.id), {
          views: increment(1)
        });
      } catch (error) {
        console.error("Error incrementing view:", error);
      }
    };
    incrementView();

    return () => unsub();
  }, [currentStory?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
      if (p >= 100) {
        handleNext();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const toggleLike = async () => {
    if (!currentUser || !storyData) return;
    const isLiked = storyData.likes.includes(currentUser.uid);
    const storyRef = doc(db, 'stories', storyData.id);

    try {
      await updateDoc(storyRef, {
        likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim() || !storyData) return;
    const storyRef = doc(db, 'stories', storyData.id);

    try {
      await updateDoc(storyRef, {
        comments: arrayUnion({
          userId: currentUser.uid,
          text: commentText,
          timestamp: new Date().toISOString()
        })
      });
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
        style={{ backgroundImage: `url(${uploader?.photoURL})` }}
      />

      {/* Main Player Container */}
      <div className="relative w-full max-w-[450px] h-full md:h-[90vh] md:rounded-3xl overflow-hidden bg-black shadow-2xl flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-2 flex gap-1 z-50">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-100 ease-linear",
                  i < currentIndex ? "w-full" : i === currentIndex ? "" : "w-0"
                )}
                style={i === currentIndex ? { width: `${progress}%` } : {}}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <img 
              src={uploader?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStory.userId}`} 
              alt={uploader?.displayName}
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
            <div>
              <h3 className="text-white font-bold text-sm">{uploader?.displayName}</h3>
              <span className="text-white/60 text-[10px] font-medium">
                {formatDistanceToNow(new Date(currentStory.timestamp))} ago
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 relative flex items-center justify-center group">
          <video
            ref={videoRef}
            src={currentStory.videoUrl}
            className="w-full h-full object-contain"
            autoPlay={isPlaying}
            muted={isMuted}
            playsInline
            onClick={() => setIsPlaying(!isPlaying)}
          />
          
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play size={64} className="text-white opacity-80" fill="white" />
            </div>
          )}

          {/* Navigation Controls */}
          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Interactions Sidebar */}
        <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-50">
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={toggleLike}
              className={cn(
                "p-3 rounded-full transition-all active:scale-90",
                storyData?.likes.includes(currentUser?.uid || '') 
                  ? "bg-red-500 text-white" 
                  : "bg-black/40 text-white backdrop-blur-md"
              )}
            >
              <Heart size={24} fill={storyData?.likes.includes(currentUser?.uid || '') ? "currentColor" : "none"} />
            </button>
            <span className="text-white text-xs font-bold shadow-sm">{storyData?.likes.length || 0}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setShowComments(true)}
              className="p-3 bg-black/40 text-white rounded-full backdrop-blur-md transition-all active:scale-90"
            >
              <MessageCircle size={24} />
            </button>
            <span className="text-white text-xs font-bold shadow-sm">{storyData?.comments?.length || 0}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button className="p-3 bg-black/40 text-white rounded-full backdrop-blur-md transition-all active:scale-90">
              <Share2 size={24} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="p-3 bg-black/40 text-white rounded-full backdrop-blur-md">
              <Eye size={24} />
            </div>
            <span className="text-white text-xs font-bold shadow-sm">{storyData?.views || 0}</span>
          </div>
        </div>

        {/* Caption & Info (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-40">
          <p className="text-white text-sm font-medium leading-relaxed max-w-[80%]">
            {currentStory.caption}
          </p>
        </div>

        {/* Comments Bottom Sheet */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 h-[60%] bg-white rounded-t-3xl z-[60] flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Comments</h4>
                <button onClick={() => setShowComments(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {storyData?.comments?.map((comment, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 bg-gray-100 rounded-2xl p-3">
                      <p className="text-xs font-bold text-gray-900 mb-1">User {comment.userId.slice(0, 4)}</p>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-2">
                <input 
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  onClick={handleAddComment}
                  className="p-2 bg-blue-600 text-white rounded-full"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
