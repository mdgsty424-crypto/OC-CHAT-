import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  Edit, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Check, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Filter, 
  Settings, 
  Globe, 
  Users, 
  MessageCircle, 
  Share2, 
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera,
  AtSign,
  Tag as TagIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import localforage from 'localforage';
import { getTransformedUrl, getFiltersTransformation, deleteCloudinaryMedia } from '../lib/cloudinary';

// Configure localforage
localforage.config({
  name: 'oc-chat',
  storeName: 'draft_media'
});

interface MediaItem {
  id: string;
  file?: File; // Optional if already uploaded
  preview: string;
  publicId?: string; // Cloudinary ID
  type: 'image' | 'video';
  isUploading?: boolean;
  filters: {
    grayscale: number;
    brightness: number;
    contrast: number;
    sepia: number;
    blur: number;
  };
}

const MediaPreview: React.FC<{ item: MediaItem, large?: boolean }> = ({ item, large }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Loader2 className="animate-spin text-black/20" size={large ? 48 : 20} />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-red-400 p-2 text-center">
          <X size={large ? 48 : 20} />
          {large && <span className="text-[10px] font-black uppercase mt-2">Failed to load media</span>}
        </div>
      ) : item.type === 'video' ? (
        <video 
          src={item.preview.includes('cloudinary.com') ? getTransformedUrl(item.preview, 'w_400,c_limit') : item.preview} 
          className={cn("w-full h-full", large ? "object-contain" : "object-cover")} 
          onLoadedData={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true); }}
          muted
          playsInline
        />
      ) : (
        <img 
          src={item.preview.includes('cloudinary.com') 
            ? getTransformedUrl(item.preview, `${getFiltersTransformation(item.filters)}${!large ? ',w_200,h_200,c_fill' : ''}`) 
            : item.preview} 
          className={cn("w-full h-full", large ? "object-contain" : "object-cover")} 
          onLoad={() => setIsLoading(false)}
          style={!item.preview.includes('cloudinary.com') ? {
            filter: `
              grayscale(${item.filters.grayscale}%)
              brightness(${item.filters.brightness}%)
              contrast(${item.filters.contrast}%)
              sepia(${item.filters.sepia}%)
              blur(${item.filters.blur}px)
            `
          } : {}}
          onError={() => { setIsLoading(false); setHasError(true); }}
          alt="" 
        />
      )}
      {item.isUploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="animate-spin text-white" size={20} />
        </div>
      )}
    </div>
  );
};

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState(1);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [settings, setSettings] = useState({
    comments: true,
    share: true,
    privacy: 'public' as 'public' | 'friends'
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence logic
  const saveDraftToDB = async (items: MediaItem[], draftCaption: string) => {
    try {
      // Store only serializable data plus the blobs
      const serializableItems = await Promise.all(items.map(async item => ({
        id: item.id,
        file: item.file, 
        preview: item.preview,
        publicId: item.publicId,
        type: item.type,
        filters: item.filters
      })));
      await localforage.setItem('draft_post', { items: serializableItems, caption: draftCaption });
    } catch (e) {
      console.error('Failed to save draft', e);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await localforage.getItem<{ items: any[], caption: string }>('draft_post');
      if (draft && draft.items.length > 0) {
        const loadedItems: MediaItem[] = draft.items.map(item => {
           // Create a new URL directly from the stored File/Blob
           const freshPreview = URL.createObjectURL(item.file);
           return {
             ...item,
             preview: freshPreview
           };
        });
        setMediaItems(loadedItems);
        setCaption(draft.caption || '');
        setSelectedMediaId(loadedItems[0].id);
      }
    } catch (e) {
      console.error('Failed to load draft', e);
    }
  };

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    if (mediaItems.length > 0 || caption) {
      saveDraftToDB(mediaItems, caption);
    }
  }, [mediaItems, caption]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newItems: MediaItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      isUploading: true,
      filters: { grayscale: 0, brightness: 100, contrast: 100, sepia: 0, blur: 0 }
    }));
    
    setMediaItems(prev => [...prev, ...newItems]);
    if (!selectedMediaId && newItems.length > 0) {
      setSelectedMediaId(newItems[0].id);
    }

    // Start individual uploads
    newItems.forEach(async (item) => {
      try {
        if (!item.file) {
          throw new Error('No file selected');
        }

        // 1. Blob Conversion: Re-creating the blob can help with WebView file reference issues
        const fileBlob = new Blob([item.file], { type: item.file.type });
        const fileName = item.file.name || `upload_${Date.now()}`;

        const formData = new FormData();
        formData.append('file', fileBlob, fileName);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

        console.log(`Starting direct Cloudinary upload for ${item.id} (${item.file.type}, ${item.file.size} bytes)`);
        
        // 2. Direct Cloudinary Upload Logic: No manual headers, bypass our server's 405
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv';
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${item.type}/upload`, { 
          method: 'POST', 
          body: formData
        });

        // 3. Try-Catch refinement: Log status and handle errors
        if (!res.ok) {
          const status = res.status;
          console.error(`Cloudinary returned error status: ${status}`);
          let errorMsg = `Upload failed with status ${status}`;
          try {
            const errorData = await res.json();
            errorMsg = errorData.error?.message || errorMsg;
          } catch (e) {
            const text = await res.text().catch(() => '');
            console.error('Cloudinary error response (text):', text);
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        console.log('Upload success for:', item.id, data.secure_url);
        
        setMediaItems(prev => prev.map(m => 
          m.id === item.id ? { ...m, preview: data.secure_url, publicId: data.public_id, isUploading: false } : m
        ));
      } catch (err: any) {
        console.error('Upload failed for item:', item.id, err);
        setError(`Upload failed: ${err.message || 'Check your internet connection'}`);
        setMediaItems(prev => prev.map(m => 
          m.id === item.id ? { ...m, isUploading: false } : m
        ));
      }
    });
  };

  const removeMedia = async (id: string) => {
    const itemToDelete = mediaItems.find(m => m.id === id);
    if (itemToDelete?.publicId) {
      deleteCloudinaryMedia(itemToDelete.publicId, itemToDelete.type);
    }

    setMediaItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (selectedMediaId === id) {
        setSelectedMediaId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const updateFilters = (id: string, newFilters: Partial<MediaItem['filters']>) => {
    setMediaItems(prev => prev.map(item => 
      item.id === id ? { ...item, filters: { ...item.filters, ...newFilters } } : item
    ));
  };

  const handleUpload = async () => {
    if (!user || mediaItems.length === 0) return;
    if (mediaItems.some(m => m.isUploading)) {
      setError('Please wait for all media to finish uploading');
      return;
    }
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadedMedia = mediaItems.map(item => ({
        url: item.preview,
        publicId: item.publicId,
        type: item.type,
        filters: item.filters
      }));

      // Generate a 6-character shortcode for the post ID
      const shortCode = Math.random().toString(36).substring(2, 8);

      const postPayload = {
        authorId: user.uid || '',
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || null,
        title: (caption || '').slice(0, 30) || 'Untitled Post',
        description: caption || '',
        mediaUrl: uploadedMedia[0]?.url || '', 
        mediaType: uploadedMedia[0]?.type || 'image',
        mediaItems: uploadedMedia.map(m => ({
          url: m.url || '',
          publicId: m.publicId || null,
          type: m.type || 'image',
          filters: m.filters || { grayscale: 0, brightness: 100, contrast: 100, sepia: 0, blur: 0 }
        })),
        likes: [],
        commentsCount: 0,
        settings: {
          comments: settings?.comments ?? true,
          share: settings?.share ?? true,
          privacy: settings?.privacy ?? 'public'
        },
        type: 'books',
        createdAt: serverTimestamp(),
      };

      // Save to Firestore with the shortcode as the document ID
      await setDoc(doc(db, 'books_posts', shortCode), postPayload);

      // Clear draft
      await localforage.removeItem('draft_post');

      setUploadProgress(100);
      setTimeout(() => navigate('/books'), 1000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsUploading(false);
    }
  };

  const currentMedia = mediaItems.find(m => m.id === selectedMediaId);

  const renderScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <div className="flex flex-col h-full">
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Select Media</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-black border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="text-blue-600" size={24} />
                  </div>
                  <span className="font-black text-sm uppercase">Add Photos/Videos</span>
                  <UploadCloud size={16} className="text-black/40" />
                </button>
              </div>

              {mediaItems.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {mediaItems.map(item => (
                    <div key={item.id} className="relative aspect-square border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000] bg-gray-100">
                      <MediaPreview item={item} />
                      <button 
                        onClick={() => removeMedia(item.id)}
                        className="absolute top-1 right-1 p-1 bg-white border border-black rounded-md shadow-sm z-10"
                      >
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                      <div className="absolute bottom-1 right-1 p-1 bg-white border border-black rounded-md shadow-sm z-10">
                        <Edit size={12} className="text-black" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*,video/*"
              onChange={handleFileSelect}
            />
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {currentMedia && (
                <div 
                  className="max-w-full max-h-[60vh] border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_#000] relative bg-black flex items-center justify-center"
                  style={{
                    filter: `
                      grayscale(${currentMedia.filters.grayscale}%)
                      brightness(${currentMedia.filters.brightness}%)
                      contrast(${currentMedia.filters.contrast}%)
                      sepia(${currentMedia.filters.sepia}%)
                      blur(${currentMedia.filters.blur}px)
                    `
                  }}
                >
                  <MediaPreview item={currentMedia} large />
                </div>
              )}

              <div className="mt-8 flex gap-4 overflow-x-auto pb-4 w-full px-4 no-scrollbar">
                {mediaItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setSelectedMediaId(item.id)}
                    className={cn(
                      "w-16 h-16 border-2 border-black rounded-xl overflow-hidden flex-shrink-0 transition-transform active:scale-95 bg-gray-100 relative",
                      selectedMediaId === item.id ? "ring-4 ring-blue-500 scale-110" : "opacity-60"
                    )}
                  >
                    <MediaPreview item={item} />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border-t-2 border-black p-6 flex items-center justify-around gap-4">
              <button className="flex-1 py-4 bg-[#00FF00] border-2 border-black rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                Edit
              </button>
              <button className="flex-1 py-4 bg-[#00FF00] border-2 border-black rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                Filter
              </button>
              <button className="flex-1 py-4 bg-[#00FF00] border-2 border-black rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                Adjust
              </button>
            </div>

            {/* Simple Controls (Adjust mock) */}
            <div className="bg-white p-6 border-t border-black space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase w-20">Brightness</span>
                <input 
                  type="range" 
                  min="0" max="200" 
                  value={currentMedia?.filters.brightness || 100}
                  onChange={(e) => selectedMediaId && updateFilters(selectedMediaId, { brightness: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase w-20">Contrast</span>
                <input 
                  type="range" 
                  min="0" max="200" 
                  value={currentMedia?.filters.contrast || 100}
                  onChange={(e) => selectedMediaId && updateFilters(selectedMediaId, { contrast: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                {[
                  { name: 'Normal', f: { grayscale: 0, sepia: 0 } },
                  { name: 'Mono', f: { grayscale: 100, sepia: 0 } },
                  { name: 'Vintage', f: { grayscale: 0, sepia: 50 } },
                  { name: 'Bold', f: { contrast: 150, brightness: 110 } }
                ].map(filter => (
                  <button 
                    key={filter.name}
                    onClick={() => selectedMediaId && updateFilters(selectedMediaId, filter.f)}
                    className="px-4 py-2 border-2 border-black rounded-full font-black text-[10px] uppercase whitespace-nowrap"
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 border-2 border-black rounded-full overflow-hidden shadow-sm">
                <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <h3 className="font-black text-lg">{user?.displayName || 'OC User'}</h3>
                <div className="flex gap-3 mt-1">
                  <button className="text-blue-500 font-black text-xs flex items-center gap-1">
                    <AtSign size={12} /> @mention
                  </button>
                  <button className="text-blue-500 font-black text-xs flex items-center gap-1">
                    <TagIcon size={12} /> Tag
                  </button>
                </div>
              </div>
            </div>

            <textarea 
              placeholder="Just type whatever comes to mind..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-40 border-2 border-black rounded-3xl p-6 font-bold text-xl outline-none placeholder:text-gray-300 shadow-[4px_4px_0px_#000] mb-8"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <MessageCircle size={20} />
                  <span className="font-black uppercase text-sm">Comment ON/OFF</span>
                </div>
                <button 
                  onClick={() => setSettings(s => ({ ...s, comments: !s.comments }))}
                  className={cn(
                    "w-12 h-6 rounded-full border-2 border-black transition-colors relative",
                    settings.comments ? "bg-[#00FF00]" : "bg-gray-200"
                  )}
                >
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white border border-black rounded-full transition-all", settings.comments ? "right-1" : "left-1")} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Share2 size={20} />
                  <span className="font-black uppercase text-sm">Share ON/OFF</span>
                </div>
                <button 
                  onClick={() => setSettings(s => ({ ...s, share: !s.share }))}
                  className={cn(
                    "w-12 h-6 rounded-full border-2 border-black transition-colors relative",
                    settings.share ? "bg-[#00FF00]" : "bg-gray-200"
                  )}
                >
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white border border-black rounded-full transition-all", settings.share ? "right-1" : "left-1")} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Globe size={20} />
                  <span className="font-black uppercase text-sm">Privacy (Public/Friends)</span>
                </div>
                <div className="flex border-2 border-black rounded-lg overflow-hidden font-black text-[10px] uppercase">
                  <button 
                    onClick={() => setSettings(s => ({ ...s, privacy: 'public' }))}
                    className={cn("px-3 py-1.5", settings.privacy === 'public' ? "bg-black text-white" : "bg-white text-black")}
                  >
                    Public
                  </button>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, privacy: 'friends' }))}
                    className={cn("px-3 py-1.5", settings.privacy === 'friends' ? "bg-black text-white" : "bg-white text-black")}
                  >
                    Friends
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Final Preview</h2>
            
            <div className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_#000] mb-8">
              <div className="p-4 flex items-center gap-3 border-b-2 border-black">
                <div className="w-10 h-10 border-2 border-black rounded-full overflow-hidden">
                  <img src={user?.photoURL || ''} alt="" />
                </div>
                <span className="font-black">{user?.displayName}</span>
              </div>
              
              <div className="aspect-[16/10] bg-black p-1">
                <div className="grid grid-cols-2 gap-1 h-full">
                  {mediaItems.slice(0, 4).map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="relative overflow-hidden"
                      style={{
                        filter: `
                          grayscale(${item.filters.grayscale}%)
                          brightness(${item.filters.brightness}%)
                          contrast(${item.filters.contrast}%)
                          sepia(${item.filters.sepia}%)
                          blur(${item.filters.blur}px)
                        `
                      }}
                    >
                      <img src={item.preview} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <p className="font-bold text-lg mb-4">{caption}</p>
                <div className="flex gap-2 text-[10px] font-black uppercase text-black/40">
                  <span>Comments {settings.comments ? 'ON' : 'OFF'}</span>
                  <span>•</span>
                  <span>{settings.privacy}</span>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-10">
                <Loader2 className="animate-spin mb-4" size={48} />
                <h3 className="text-2xl font-black uppercase mb-8">Publishing Post</h3>
                <div className="w-full h-8 border-4 border-black rounded-full p-1 bg-white relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-black text-xs">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <p className="mt-4 font-bold text-black/60 italic text-center">Simultaneously uploading all media to cloud...</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white px-6 flex items-center justify-between border-b-[3px] border-black sticky top-0 z-[100]">
        <button 
          onClick={() => currentScreen > 1 ? setCurrentScreen(s => s - 1) : navigate(-1)}
          className="p-2 border-2 border-black rounded-xl hover:bg-gray-50 active:scale-90 transition-all font-black"
        >
          <ChevronLeft size={24} />
        </button>
        
        <h1 className="text-xl font-black uppercase tracking-widest text-[#4A90E2]">
          Create <span className="text-black">Post</span>
        </h1>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                s === currentScreen ? "w-6 bg-black" : "w-1.5 bg-black/10"
              )} 
            />
          ))}
        </div>
      </header>

      {/* Screen Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="p-6 border-t-[3px] border-black bg-white flex items-center justify-end">
        {currentScreen < 4 ? (
          <button 
            onClick={() => setCurrentScreen(s => s + 1)}
            disabled={mediaItems.length === 0}
            className="px-8 py-3 bg-[#4A90E2] text-white border-[3px] border-black rounded-2xl font-black uppercase text-xl flex items-center gap-2 shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:grayscale"
          >
            Next <ChevronRight size={24} />
          </button>
        ) : (
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="px-8 py-3 bg-black text-white border-[3px] border-black rounded-2xl font-black uppercase text-xl flex items-center gap-2 shadow-[4px_4px_#4A90E2] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            {isUploading ? 'Posting...' : 'Post'} <Check size={24} />
          </button>
        )}
      </footer>

      {error && (
        <div className="fixed top-24 left-6 right-6 p-4 bg-red-100 border-2 border-red-500 rounded-xl font-black text-red-700 flex items-center justify-between z-[200]">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={20} /></button>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
