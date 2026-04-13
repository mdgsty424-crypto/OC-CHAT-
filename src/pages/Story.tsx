import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Heart, MessageCircle, Bookmark, Share2, Pin, ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Story() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reels, setReels] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isUploading, setIsUploading] = useState(location.state?.openUpload || false);
  const [uploadForm, setUploadForm] = useState({ description: '', file: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isAd: false }));
      setReels(fetchedReels);
    });

    const fetchAds = async () => {
      const adsSnap = await getDocs(collection(db, 'ads'));
      setAds(adsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isAd: true })));
    };
    fetchAds();

    return () => unsubscribe();
  }, []);

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
      setCurrentIndex(index);
    }
  };

  const handleLike = async (reelId: string, likes: string[]) => {
    if (!user) return;
    const reelRef = doc(db, 'stories', reelId);
    if (likes.includes(user.uid)) {
      await updateDoc(reelRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(reelRef, { likes: arrayUnion(user.uid) });
    }
  };

  const handleUpload = async () => {
    if (!user || !uploadForm.file) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        await addDoc(collection(db, 'stories'), {
          authorId: user.uid,
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          description: uploadForm.description,
          mediaUrl: data.url,
          mediaType: uploadForm.file.type.startsWith('video/') ? 'video' : 'image',
          likes: [],
          comments: [],
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        setUploadForm({ description: '', file: null });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merge reels and ads (1 ad every 5 reels)
  const feed = [];
  let adIndex = 0;
  for (let i = 0; i < reels.length; i++) {
    feed.push(reels[i]);
    if ((i + 1) % 5 === 0 && ads.length > 0) {
      feed.push(ads[adIndex % ads.length]);
      adIndex++;
    }
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-6 left-4 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <button 
        onClick={() => setIsUploading(true)} 
        className="absolute top-6 right-4 z-50 p-3 bg-blue-600/80 backdrop-blur-md rounded-full text-white hover:bg-blue-600 transition-colors"
      >
        <Plus size={24} />
      </button>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
      >
        {feed.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/50">No stories available</div>
        ) : (
          feed.map((reel, index) => (
            <div key={reel.id + index} className="h-screen w-full snap-start relative bg-gray-900 flex items-center justify-center">
              {reel.mediaType === 'video' ? (
                <video 
                  src={reel.mediaUrl} 
                  className="w-full h-full object-cover"
                  autoPlay={index === currentIndex}
                  loop
                  muted={false}
                  playsInline
                />
              ) : (
                <img src={reel.mediaUrl} alt="Story" className="w-full h-full object-cover" />
              )}

              {/* Overlay UI */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
              
              {reel.isAd && (
                <div className="absolute top-20 left-4 bg-yellow-400 text-black text-xs font-black px-2 py-1 rounded z-10 pointer-events-auto">
                  Sponsored
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-16 p-6 pb-24 pointer-events-auto">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden border border-white/20">
                    <img src={reel.authorPhoto || `https://ui-avatars.com/api/?name=${reel.authorName || 'Ad'}`} alt="Author" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-bold text-lg">@{reel.authorName || reel.brandName || 'Sponsored Ad'}</span>
                  {!reel.isAd && (
                    <button className="px-3 py-1 border border-white/50 rounded-full text-white text-xs font-bold hover:bg-white/10 transition-colors">
                      Follow
                    </button>
                  )}
                </div>
                <p className="text-white text-sm line-clamp-2">{reel.description || 'No description'}</p>
                {reel.isAd && (
                  <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700">
                    {reel.ctaText || 'Learn More'}
                  </button>
                )}
              </div>

              {/* Right Action Bar */}
              {!reel.isAd && (
                <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6 pointer-events-auto">
                  <button onClick={() => handleLike(reel.id, reel.likes || [])} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <Heart size={24} className={cn("text-white", (reel.likes || []).includes(user?.uid) && "fill-red-500 text-red-500")} />
                    </div>
                    <span className="text-white text-xs font-bold">{(reel.likes || []).length}</span>
                  </button>
                  
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <MessageCircle size={24} className="text-white" />
                    </div>
                    <span className="text-white text-xs font-bold">{(reel.comments || []).length}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <Bookmark size={24} className="text-white" />
                    </div>
                    <span className="text-white text-xs font-bold">Save</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <Pin size={24} className="text-white" />
                    </div>
                    <span className="text-white text-xs font-bold">Pin</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <Share2 size={24} className="text-white" />
                    </div>
                    <span className="text-white text-xs font-bold">Share</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Upload Reel</h2>
                <button onClick={() => setIsUploading(false)} className="p-2 hover:bg-gray-800 rounded-full text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <textarea 
                  placeholder="Description" 
                  value={uploadForm.description} 
                  onChange={e => setUploadForm({...uploadForm, description: e.target.value})} 
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl py-3 px-4 outline-none h-24 resize-none" 
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-800 hover:border-blue-500 transition-colors"
                >
                  {uploadForm.file ? (
                    <span className="font-medium text-blue-400">{uploadForm.file.name}</span>
                  ) : (
                    <>
                      <Plus size={32} className="mb-2" />
                      <span>Select Vertical Video (&lt;60s)</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})} 
                  className="hidden" 
                  accept="video/*"
                />

                <button 
                  onClick={handleUpload} 
                  disabled={isSubmitting || !uploadForm.file}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Post Reel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
