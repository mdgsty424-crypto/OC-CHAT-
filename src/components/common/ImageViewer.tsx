import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { useGesture } from '@use-gesture/react';
import { X, Heart, MessageCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Media {
  url: string;
  hdUrl?: string;
  alt?: string;
  type?: 'image' | 'video';
}

interface ImageViewerProps {
  images: Media[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // For zoom and pan
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setCrop({ x: 0, y: 0, scale: 1 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCrop({ x: 0, y: 0, scale: 1 });
      setIsZoomed(false);
    }
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCrop({ x: 0, y: 0, scale: 1 });
      setIsZoomed(false);
    }
  }, [currentIndex]);

  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y], direction: [dx, dy], velocity: [vx, vy], down, movement: [mx, my] }) => {
        if (!isZoomed) {
          // Swipe down to close logic
          if (my > 50 && !down && vy > 0.5) {
            onClose();
          } else if (down) {
            // Visual feedback while dragging down
            if (my > 0) {
              setCrop(prev => ({ ...prev, y: my, scale: 1 - my / 1000 }));
            }
          } else {
            // Snap back
            setCrop({ x: 0, y: 0, scale: 1 });
          }
        } else {
          // Panning when zoomed
          setCrop(prev => ({
            ...prev,
            x: x,
            y: y,
          }));
        }
      },
      onPinch: ({ offset: [d, a], origin: [ox, oy], first, movement: [ms], velocity, memo }) => {
        const scale = Math.max(1, ms + 1);
        setIsZoomed(scale > 1.05);
        setCrop(prev => ({ ...prev, scale }));
      },
    },
    {
      drag: {
        filterTaps: true,
        bounds: isZoomed ? undefined : { top: 0 },
      },
    }
  );

  if (!isOpen) return null;

  const currentMedia = images[currentIndex];
  const isVideo = currentMedia?.type === 'video';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="image-viewer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex flex-col bg-black overflow-hidden touch-none"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white font-medium">
              {currentIndex + 1} / {images.length}
            </div>
            <button
              id="image-viewer-close-btn"
              onClick={onClose}
              className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Content Container */}
          <div
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center p-0"
            {...(bind() as any)}
          >
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: crop.scale,
                x: crop.x,
                y: crop.y,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                scale: { duration: 0.1 }
              }}
              className="w-full h-full flex items-center justify-center"
            >
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={currentMedia.hdUrl || currentMedia.url}
                  autoPlay
                  controls
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  onPlay={() => setIsZoomed(false)}
                />
              ) : (
                <img
                  src={currentMedia.hdUrl || currentMedia.url}
                  alt={currentMedia.alt || 'Gallery item'}
                  className="max-w-full max-h-full object-contain select-none pointer-events-none shadow-2xl rounded-sm"
                  draggable={false}
                />
              )}
            </motion.div>

            {/* Navigation Arrows (Desktop) */}
            {images.length > 1 && !isZoomed && (
              <>
                {currentIndex > 0 && (
                  <button
                    id="image-viewer-prev-btn"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all hidden md:flex"
                  >
                    <ChevronLeft size={32} />
                  </button>
                )}
                {currentIndex < images.length - 1 && (
                  <button
                    id="image-viewer-next-btn"
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all hidden md:flex"
                  >
                    <ChevronRight size={32} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-6">
                <button id="image-viewer-like" className="flex items-center gap-2 text-white hover:text-red-500 transition-colors group">
                  <Heart size={28} className="group-active:scale-125 transition-transform" />
                  <span className="text-base font-bold shadow-sm">Like</span>
                </button>
                <button id="image-viewer-comment" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
                  <MessageCircle size={28} />
                  <span className="text-base font-bold shadow-sm">Comment</span>
                </button>
                <button id="image-viewer-share" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity ml-auto">
                  <Share2 size={28} />
                  <span className="text-base font-bold shadow-sm">Share</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="image-viewer-comment-input"
                  type="text"
                  placeholder="Write a comment..."
                  className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-full py-3.5 px-6 text-white text-base focus:outline-none focus:bg-white/30 transition-all placeholder:text-white/70 shadow-lg"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewer;
