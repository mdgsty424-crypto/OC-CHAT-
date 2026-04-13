import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, ArrowLeft, Plus, X, Loader2, Volume2, VolumeX, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../components/common/VerifiedBadge';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  isVerified?: boolean;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: any[];
  mentions?: string[];
  createdAt: any;
  isAd?: boolean;
  ctaText?: string;
  brandName?: string;
}

export default function Books() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(location.state?.openUpload || false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', mentions: '', file: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [showForward, setShowForward] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'books_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(fetchedPosts);
    });

    const fetchAds = async () => {
      const adsSnap = await getDocs(collection(db, 'ads'));
      setAds(adsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isAd: true })));
    };
    fetchAds();

    if (user) {
      const chatsQ = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc'),
        limit(10)
      );
      const chatsUnsub = onSnapshot(chatsQ, (snapshot) => {
        setRecentChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => {
        unsubscribe();
        chatsUnsub();
      };
    }

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (postId: string, likes: string[]) => {
    if (!user) return;
    const postRef = doc(db, 'books_posts', postId);
    if (likes.includes(user.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.uid) });
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    const postRef = doc(db, 'books_posts', postId);
    const newComment = {
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      text: commentText,
      timestamp: new Date().toISOString()
    };
    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });
    setCommentText('');
  };

  const handleForward = async (chatId: string, post: Post) => {
    if (!user) return;
    try {
      const postLink = `${window.location.origin}/books?post=${post.id}`;
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text: `Shared a post: ${post.title}\n${postLink}`,
        type: 'text',
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: `Shared a post: ${post.title}`,
        lastMessageTimestamp: serverTimestamp()
      });
      setShowForward(null);
      alert('Post shared to chat!');
    } catch (error) {
      console.error('Error sharing post:', error);
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
        const mentions = uploadForm.mentions.split(' ').filter(m => m.startsWith('@')).map(m => m.slice(1));
        await addDoc(collection(db, 'books_posts'), {
          authorId: user.uid,
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          isVerified: user.role === 'admin' || user.isVerified,
          title: uploadForm.title,
          description: uploadForm.description,
          mediaUrl: data.url,
          mediaType: uploadForm.file.type.startsWith('video/') ? 'video' : 'image',
          likes: [],
          comments: [],
          mentions,
          type: 'books',
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        setUploadForm({ title: '', description: '', mentions: '', file: null });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feed = [];
  let adIndex = 0;
  for (let i = 0; i < posts.length; i++) {
    feed.push(posts[i]);
    if ((i + 1) % 5 === 0 && ads.length > 0) {
      feed.push(ads[adIndex % ads.length]);
      adIndex++;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Books (Social Feed)</h1>
        </div>
        <button onClick={() => setIsUploading(true)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {feed.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">No posts yet. Be the first to post!</div>
        ) : (
          feed.map((item, index) => (
            <PostCard 
              key={item.id + index} 
              post={item} 
              currentUser={user} 
              onLike={() => handleLike(item.id, item.likes || [])}
              onComment={() => setShowComments(item.id)}
              onForward={() => setShowForward(item)}
            />
          ))
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create Books Post</h2>
                <button onClick={() => setIsUploading(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Title (Bold)" 
                  value={uploadForm.title} 
                  onChange={e => setUploadForm({...uploadForm, title: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <textarea 
                  placeholder="Description" 
                  value={uploadForm.description} 
                  onChange={e => setUploadForm({...uploadForm, description: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none h-24 resize-none focus:ring-2 focus:ring-blue-500" 
                />
                <input 
                  type="text" 
                  placeholder="Mentions (e.g. @friend1 @friend2)" 
                  value={uploadForm.mentions} 
                  onChange={e => setUploadForm({...uploadForm, mentions: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500" 
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-colors"
                >
                  {uploadForm.file ? (
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-blue-600">{uploadForm.file.name}</span>
                      <span className="text-xs text-gray-400">Click to change</span>
                    </div>
                  ) : (
                    <>
                      <Plus size={32} className="mb-2" />
                      <span>Select Photo or Video</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})} 
                  className="hidden" 
                  accept="image/*,video/*"
                />

                <button 
                  onClick={handleUpload} 
                  disabled={isSubmitting || !uploadForm.file || !uploadForm.title}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Post to Books'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-black/40 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-3xl h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg">Comments</h3>
                <button onClick={() => setShowComments(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.find(p => p.id === showComments)?.comments?.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <img src={c.userPhoto || `https://ui-avatars.com/api/?name=${c.userName}`} className="w-8 h-8 rounded-full" alt="" />
                    <div className="bg-gray-100 p-3 rounded-2xl flex-1">
                      <p className="text-xs font-bold">{c.userName}</p>
                      <p className="text-sm">{c.text}</p>
                    </div>
                  </div>
                )) || <div className="text-center text-gray-400 py-10">No comments yet.</div>}
              </div>
              <div className="p-4 border-t flex gap-2">
                <input 
                  type="text" 
                  placeholder="Write a comment..." 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none"
                />
                <button 
                  onClick={() => handleAddComment(showComments)}
                  className="p-2 bg-blue-600 text-white rounded-full"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forward Sheet */}
      <AnimatePresence>
        {showForward && (
          <div className="fixed inset-0 bg-black/40 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-3xl h-[60vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg">Forward to Chat</h3>
                <button onClick={() => setShowForward(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Search chats..." className="w-full bg-gray-100 rounded-xl py-2 pl-10 pr-4 outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 space-y-2">
                {recentChats.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={() => handleForward(chat.id, showForward)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                      <img src={chat.participantsInfo?.find((p: any) => p.uid !== user?.uid)?.photoURL || `https://ui-avatars.com/api/?name=Chat`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{chat.participantsInfo?.find((p: any) => p.uid !== user?.uid)?.displayName || 'Direct Chat'}</p>
                      <p className="text-xs text-gray-500">Recent conversation</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PostCardProps {
  key?: string | number;
  post: Post;
  currentUser: any;
  onLike: () => void;
  onComment: () => void;
  onForward: () => void;
}

function PostCard({ post, currentUser, onLike, onComment, onForward }: PostCardProps) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (post.mediaType === 'video' && videoRef.current) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      }, { threshold: 0.5 });
      observer.observe(videoRef.current);
      return () => observer.disconnect();
    }
  }, [post.mediaType]);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative border border-gray-100">
      {post.isAd && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded z-10 uppercase tracking-widest">
          Sponsored
        </div>
      )}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
            <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName || 'Ad'}`} alt="Author" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-sm">{post.authorName || post.brandName || 'Sponsored Ad'}</h3>
              {post.isVerified && <VerifiedBadge className="w-4 h-4 text-yellow-400" />}
            </div>
            {!post.isAd && <p className="text-[10px] text-gray-500 font-medium">{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleString() : 'Just now'}</p>}
          </div>
        </div>
        {!post.isAd && (
          <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <h4 className="font-black text-lg text-gray-900 leading-tight">{post.title}</h4>
        <p className="text-gray-700 text-sm mt-1 leading-relaxed">{post.description}</p>
        {post.mentions && post.mentions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.mentions.map((m, i) => (
              <span key={i} className="text-blue-600 text-xs font-bold hover:underline cursor-pointer">@{m}</span>
            ))}
          </div>
        )}
      </div>

      {post.mediaUrl && (
        <div className="w-full relative bg-black aspect-video sm:aspect-square overflow-hidden">
          {post.mediaType === 'video' ? (
            <>
              <video 
                ref={videoRef}
                src={post.mediaUrl} 
                loop 
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain" 
              />
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </>
          ) : (
            <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
          )}
          {post.isAd && (
            <div className="absolute bottom-4 left-4 right-4">
              <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-wider text-sm">
                {post.ctaText || 'Learn More'}
              </button>
            </div>
          )}
        </div>
      )}

      {!post.isAd && (
        <div className="p-4">
          <div className="flex items-center gap-6">
            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={onLike} 
              className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
            >
              <Heart size={24} className={cn((post.likes || []).includes(currentUser?.uid) && "fill-red-500 text-red-500")} />
              <span className="font-bold text-sm">{(post.likes || []).length}</span>
            </motion.button>
            <button onClick={onComment} className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
              <MessageCircle size={24} />
              <span className="font-bold text-sm">{(post.comments || []).length}</span>
            </button>
            <button onClick={onForward} className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
              <Send size={24} />
            </button>
            <div className="flex-1" />
            <button className="text-gray-600 hover:text-gray-900">
              <Share2 size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
