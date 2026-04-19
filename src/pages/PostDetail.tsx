import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Helmet } from 'react-helmet-async';
import { Loader2, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'motion/react';
// We'll need BookCard from a separate component file if we want to reuse it, 
// but for now I'll just copy the necessary logic or import it if possible.
// Actually, since everything is in Books.tsx, I'll extract it later.
// For now, I'll implement a standalone detail view.

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      if (!postId) return;
      try {
        const docRef = doc(db, 'books_posts', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-black mb-4" size={48} />
        <p className="font-black text-xl uppercase tracking-tighter">Loading Post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Helmet>
          <title>Post Not Found | OC-CHAT</title>
        </Helmet>
        <div className="w-24 h-24 bg-gray-100 rounded-[2rem] border-4 border-black flex items-center justify-center mb-6 shadow-[8px_8px_0px_#000]">
          <ArrowLeft size={48} className="text-black" />
        </div>
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Post not found</h2>
        <button 
          onClick={() => navigate('/books')}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xl border-4 border-black shadow-[4px_4px_0px_#4A90E2]"
        >
          BACK TO FEED
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Helmet>
        <title>{post.title || 'Post'} on OC-CHAT</title>
      </Helmet>
      
      <header className="bg-white border-b-4 border-black p-4 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 border-2 border-black rounded-xl hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#000]"
        >
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black tracking-tighter uppercase truncate flex-1">Post Details</h1>
        <button 
          onClick={() => navigate('/')}
          className="p-2 border-2 border-black rounded-xl hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#000]"
        >
          <Home size={24} strokeWidth={3} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* We can eventually move BookCard to a shared components folder */}
        <div className="bg-white border-4 border-black rounded-[2.5rem] p-6 shadow-[12px_12px_0px_#000]">
           <div className="flex items-center gap-4 mb-6">
             <img src={post.authorPhoto} className="w-16 h-16 rounded-full border-4 border-black shadow-sm" alt="" />
             <div>
               <h3 className="font-black text-2xl tracking-tighter">{post.authorName}</h3>
               <p className="text-black/40 font-bold uppercase text-xs tracking-widest">PUBLISHED RECENTLY</p>
             </div>
           </div>
           
           <div className="space-y-4 mb-6">
             <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">{post.title}</h2>
             <p className="text-xl font-bold text-black/70 leading-tight">{post.description}</p>
           </div>

           <div className="border-4 border-black rounded-[2rem] overflow-hidden bg-black mb-6">
             {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls className="w-full aspect-video object-cover" />
             ) : (
                <img src={post.mediaUrl} className="w-full object-cover" alt="" />
             )}
           </div>

           <div className="flex items-center justify-between border-t-4 border-black pt-6">
             <div className="flex items-center gap-2">
               <span className="font-black text-2xl">{post.likes?.length || 0}</span>
               <span className="font-bold text-black/40 uppercase text-sm tracking-widest">Likes</span>
             </div>
             <button 
                onClick={() => navigate('/books')}
                className="font-black text-[#4A90E2] uppercase tracking-tighter hover:underline"
             >
               Join the conversation in Books
             </button>
           </div>
        </div>
      </main>
    </div>
  );
}
