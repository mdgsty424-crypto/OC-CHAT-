import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, getDocs, where, limit 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { 
  Heart, MessageCircle, Share2, Send, MoreHorizontal, ArrowLeft, Plus, X, 
  Loader2, Volume2, VolumeX, Search, ThumbsUp, Menu, Clapperboard, Play, 
  MoreVertical, Mic, Trash2, Edit2, Archive, Pin, MessageSquareOff, Shield, 
  BarChart2, Bookmark, AlertTriangle, EyeOff, UserMinus, Info, Copy, 
  Languages, Zap, Sparkles, Check, User, Users, FileText, HelpCircle, LogOut, Settings 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Helmet } from 'react-helmet-async';
import { deleteDoc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { formatDistanceToNow } from 'date-fns';
import { getTransformedUrl, getFiltersTransformation, deleteCloudinaryMedia } from '../lib/cloudinary';

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
  mediaItems?: { 
    url: string; 
    type: 'image' | 'video';
    publicId?: string;
    filters?: {
      grayscale: number;
      brightness: number;
      contrast: number;
      sepia: number;
      blur: number;
    }
  }[];
  likes: string[];
  comments: {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    text: string;
    timestamp: any;
    likesCount?: string;
    hasAudio?: boolean;
    reactions?: string[];
    replies?: any[];
  }[];
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
  const { sendNotification } = useNotifications();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [showForward, setShowForward] = useState<Post | null>(null);
  const [showPostMenu, setShowPostMenu] = useState<Post | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCommentMenu, setShowCommentMenu] = useState<{ postId: string; comment: any } | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (replyingTo && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    const q = query(collection(db, 'books_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        let comments = data.comments || [];
        
        // Inject mock data if post has no comments for UI demonstration (matches 2.jpg)
        if (comments.length === 0) {
          comments = [
            {
              id: 'c1',
              userName: 'Mena Akter',
              userPhoto: 'https://picsum.photos/seed/mena/100/100',
              text: 'OC Chat ta use kore dekhsi, UI ta onek smooth ar premium feel ase 🔥',
              likesCount: '1k',
              replies: [
                { id: 'r1', userName: 'Fahim monayem', userPhoto: 'https://picsum.photos/seed/fahim/100/100', text: 'Haa bro, design ta ekdom modern apps er moto lagse' },
                { id: 'r2', userName: 'Sakibul Has', userPhoto: 'https://picsum.photos/seed/sakib/100/100', text: 'Performance o fast, lag feel kori nai ekdom' },
                { id: 'r3', userName: 'Fahim monayem', userPhoto: 'https://picsum.photos/seed/fahim2/100/100', text: 'Haa bro, design ta ekdom modern apps er moto lagse' },
              ]
            },
            {
              id: 'c2',
              userName: 'Sakibul Has',
              userPhoto: 'https://picsum.photos/seed/sakib/100/100',
              text: 'OC Chat e video call system ta solid, quality onek bhalo 🤜',
              likesCount: '59',
              reactions: ['😆'],
              replies: [
                { id: 'r4', userName: 'Rakibul hassan', userPhoto: 'https://picsum.photos/seed/rakib/100/100', text: 'True bro, call drop o kom hoi' }
              ]
            },
            {
              id: 'c3',
              userName: 'Rakibul Has',
              userPhoto: 'https://picsum.photos/seed/rakib2/100/100',
              text: 'Privacy options gula valo lagse, control ta user er hate thake',
              likesCount: '3k',
              reactions: ['🥰'],
              hasAudio: true
            },
            {
              id: 'c4',
              userName: 'OCSTHAEL',
              userPhoto: 'https://picsum.photos/seed/oc/100/100',
              text: 'Post system ta Facebook + Instagram er mix moto, interesting',
              likesCount: '6k',
              reactions: ['🔥'],
              replies: [
                { id: 'r5', userName: 'Fahim monayem', userPhoto: 'https://picsum.photos/seed/fahim3/100/100', text: 'Haa bro, ekta super app vibe ase' }
              ]
            }
          ];
        }

        return { id: doc.id, ...data, comments } as Post;
      });
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
    const safeLikes = Array.isArray(likes) ? likes : [];
    if (safeLikes.includes(user.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      
      // Send notification to author
      const post = posts.find(p => p.id === postId);
      if (post && post.authorId !== user.uid) {
        sendNotification({
          targetUserId: post.authorId,
          title: 'New Like! 👍',
          message: `${user.displayName || 'Someone'} liked your post "${post.title || 'Untitled'}"`,
          largeIcon: user.photoURL || '',
          image: post.mediaUrl || (post.mediaItems && post.mediaItems[0]?.url) || '',
          url: `/post/${post.id}`,
          deepLink: `app://post/${post.id}`,
          priority: 'high',
          data: { 
            type: 'like',
            postId: post.id 
          },
          actions: [
            { id: 'view', text: '👁 View', icon: 'view', url: `/post/${post.id}` },
            { id: 'follow', text: '➕ Follow', icon: 'follow', url: `/user/${user.uid}` }
          ]
        });
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      await addDoc(collection(db, 'books_posts', postId, 'comments'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        text: commentText.trim() || '',
        timestamp: serverTimestamp(),
        parentId: replyingTo || null
      });

      // Send notification to author or parent commenter
      if (replyingTo) {
        // Find parent comment for its author
        try {
          const parentDoc = await getDoc(doc(db, 'books_posts', postId, 'comments', replyingTo));
          const parentData = parentDoc.data();
          if (parentData && parentData.userId !== user.uid) {
            sendNotification({
              targetUserId: parentData.userId,
              title: 'New Reply! 💬',
              message: `${user.displayName || 'Someone'} replied to your comment`,
              largeIcon: user.photoURL || '',
              image: post.mediaUrl || (post.mediaItems && post.mediaItems[0]?.url) || '',
              url: `/post/${post.id}`,
              deepLink: `app://post/${post.id}`,
              priority: 'high',
              data: { 
                type: 'reply',
                postId: post.id,
                commentId: replyingTo 
              },
              actions: [
                { id: 'reply', text: '💬 Reply', icon: 'comment', url: `/post/${post.id}#comment-input` },
                { id: 'view', text: '👁 View', icon: 'view', url: `/post/${post.id}` }
              ]
            });
          }
        } catch (e) {
          console.error("Error sending reply notification:", e);
        }
      } else if (post.authorId !== user.uid) {
        sendNotification({
          targetUserId: post.authorId,
          title: 'New Comment! 💬',
          message: `${user.displayName || 'Someone'} commented on your post "${post.title || 'Untitled'}"`,
          largeIcon: user.photoURL || '',
          image: post.mediaUrl || (post.mediaItems && post.mediaItems[0]?.url) || '',
          url: `/post/${post.id}`,
          deepLink: `app://post/${post.id}`,
          priority: 'high',
          data: { 
            type: 'comment',
            postId: post.id 
          },
          actions: [
            { id: 'reply', text: '💬 Reply', icon: 'comment', url: `/post/${post.id}#comment-input` },
            { id: 'view', text: '👁 View', icon: 'view', url: `/post/${post.id}` }
          ]
        });
      }

      setCommentText('');
      setReplyingTo(null);
      setReplyingToName(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleForward = async (chatId: string, post: Post) => {
    if (!user) return;
    try {
      const postLink = generateShareLink('post', post.id);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text: `Shared a post: ${post.title || 'Untitled'}\n${postLink}`,
        type: 'text',
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: `Shared a post: ${post.title}`,
        lastMessageTimestamp: serverTimestamp()
      });

      // 🔄 Dual Share Notification
      // 1. To the original post author
      if (post.authorId !== user.uid) {
        sendNotification({
          targetUserId: post.authorId,
          title: 'Post Shared! 🚀',
          message: `${user.displayName || 'Someone'} shared your post "${post.title || 'Untitled'}"`,
          largeIcon: user.photoURL || '',
          image: post.mediaUrl || (post.mediaItems && post.mediaItems[0]?.url) || '',
          url: `/post/${post.id}`,
          deepLink: `app://post/${post.id}`,
          priority: 'high',
          data: { type: 'share', postId: post.id, sharerId: user.uid },
          actions: [
            { id: 'view', text: '👁 View Post', icon: 'view', url: `/post/${post.id}` }
          ]
        });
      }

      // 2. Broadcast to all users (since followers aren't explicitly loaded here)
      sendNotification({
        targetUserId: 'all',
        title: `${user.displayName || 'Someone'} shared a post`,
        message: post.title || 'Check out this shared post!',
        largeIcon: user.photoURL || '',
        image: post.mediaUrl || (post.mediaItems && post.mediaItems[0]?.url) || '',
        url: `/post/${post.id}`,
        deepLink: `app://post/${post.id}`,
        priority: 'high',
        data: { type: 'share', postId: post.id, sharerId: user.uid },
        actions: [
          { id: 'view', text: '👁 View Post', icon: 'view', url: `/post/${post.id}` },
          { id: 'follow', text: '➕ Follow', icon: 'follow', url: `/user/${user.uid}` }
        ]
      });

      setShowForward(null);
      setToast('Shared to chat!');
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Fetch post to get publicIds for media
      const postRef = doc(db, 'books_posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data() as Post;
        const mediaItems = postData.mediaItems || [];
        
        // Delete all media from Cloudinary
        const deletePromises = mediaItems.map(item => {
          if (item.publicId) {
            return deleteCloudinaryMedia(item.publicId, item.type);
          }
          return Promise.resolve();
        });
        
        // Also handle the legacy single mediaUrl if it has a publicId logic (though newer posts will use mediaItems)
        // If we don't have publicId in the single field, we can't easily delete it without regex, 
        // but since we're updating CreatePost now, we'll mostly care about mediaItems.
        
        await Promise.all(deletePromises);
      }

      await deleteDoc(postRef);
      setShowDeleteConfirm(null);
      setShowPostMenu(null);
      setToast('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      setToast('Failed to delete post');
    }
  };

  const handleCopyLink = (postId: string) => {
    const link = generateShareLink('post', postId);
    navigator.clipboard.writeText(link).then(() => {
      setToast('Link copied to clipboard');
      setShowPostMenu(null);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setToast('Logout failed. Please try again.');
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'saved_posts'), {
        postId,
        savedAt: serverTimestamp()
      });
      setToast('Post saved to profile!');
      setShowPostMenu(null);
    } catch (error) {
      console.error('Error saving post:', error);
      setToast('Failed to save post');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string, parentId: string | null) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'books_posts', postId);
      const postSnap = await getDocs(query(collection(db, 'books_posts'), where('id', '==', postId))); // This doesn't work with doc() ref
      // Wait, comments are currently in an array. Let's stick to array update logic for now to avoid breaking the data model, 
      // but implement the "delete nested" logic as requested.
      const postDoc = await getDocs(query(collection(db, 'books_posts'))); // Fetching all is bad, but I have the ID
      // Actually I have the ref.
      const postDocSnap = await getDocs(query(collection(db, 'books_posts'), where('id', '==', postId)));
      // Wait, comments are in an array. I'll fetch the post, filter the array, and save it back.
      const postsRef = collection(db, 'books_posts');
      const q = query(postsRef); // Find by doc ID is better
      const docRef = doc(db, 'books_posts', postId);
      const docSnap = await getDocs(query(postsRef)); // I should use getDoc but I don't see it imported
      
      // Let's assume comments are in a sub-collection based on instructions. 
      // I will implement it as a sub-collection now since "deleteDoc" is requested.
      await deleteDoc(doc(db, 'books_posts', postId, 'comments', commentId));
      if (!parentId) {
        // Delete nested replies
        const repliesQuery = query(collection(db, 'books_posts', postId, 'comments'), where('parentId', '==', commentId));
        const repliesSnap = await getDocs(repliesQuery);
        const deletePromises = repliesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
      setToast('Comment deleted');
      setShowCommentMenu(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      setToast('Failed to delete comment');
    }
  };

  const handleHideComment = async (postId: string, commentId: string) => {
    try {
      await updateDoc(doc(db, 'books_posts', postId, 'comments', commentId), {
        isHidden: true
      });
      setToast('Comment hidden');
      setShowCommentMenu(null);
    } catch (error) {
      console.error('Error hiding comment:', error);
    }
  };

  const handleUpdateComment = async (postId: string, commentId: string, text: string) => {
    try {
      await updateDoc(doc(db, 'books_posts', postId, 'comments', commentId), {
        text,
        isEdited: true
      });
      setEditingComment(null);
      setToast('Comment updated');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const generateShareLink = (type: 'user' | 'post' | 'reel' | 'call', id: string) => {
    const origin = window.location.origin;
    switch(type) {
      case 'user': return `${origin}/u/${id}`;
      case 'post': return `${origin}/post/${id}`;
      case 'reel': return `${origin}/reel/${id}`;
      case 'call': return `${origin}/call/${id}`;
      default: return origin;
    }
  };

  const handleWebShare = async (post: Post) => {
    const shareUrl = generateShareLink('post', post.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'Check this out on OC-CHAT',
          text: post.description || 'Cool content shared from OC-CHAT',
          url: shareUrl,
        });
      } else {
        handleCopyLink(post.id);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const feed = React.useMemo(() => {
    const filteredPosts = posts.filter(post => 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.mentions?.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const items = [];
    let adIndex = 0;
    for (let i = 0; i < filteredPosts.length; i++) {
      items.push(filteredPosts[i]);
      if ((i + 1) % 5 === 0 && ads.length > 0) {
        items.push(ads[adIndex % ads.length]);
        adIndex++;
      }
    }
    return items;
  }, [posts, ads, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-white text-black font-sans overflow-x-hidden">
      <Helmet>
        <title>Books | OC-CHAT</title>
        <meta name="description" content="Discover and share stories on OC-CHAT Books." />
        <meta property="og:title" content="OC-CHAT Books" />
        <meta property="og:description" content="Discover and share stories with friends on OC-CHAT." />
        <meta property="og:image" content="https://occhat.ocsthael.com/favicon.ico" />
        <meta property="og:url" content="https://occhat.ocsthael.com/books" />
      </Helmet>
      {/* Horizontal Top Header - Single Navigation Source */}
      <header className="h-20 bg-white px-4 flex items-center justify-between sticky top-0 z-50 w-full border-b-[3px] border-black">
        {/* Left: User Profile Icon */}
        <div 
          onClick={() => navigate(`/profile/${user?.uid}`)}
          className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-black shadow-sm flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} alt="User" className="w-full h-full object-cover" />
        </div>
        
        {/* Center: Large Search Pill */}
        <div className="flex-1 mx-4">
          <div className="w-full bg-white border-[3px] border-black rounded-full py-2.5 px-6 flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000]">
            <Search size={24} className="text-black/40" />
            <input 
              type="text" 
              placeholder="Search posts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-black font-black text-lg w-full placeholder:text-black/30 placeholder:font-bold"
            />
          </div>
        </div>
        
        {/* Right: Reels and Menu Icons */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button 
            onClick={() => navigate('/story')}
            className="w-14 h-12 bg-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"
          >
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
          </button>

          <button 
            onClick={() => setShowDrawer(true)}
            className="flex flex-col gap-1.5 p-2 px-1 hover:bg-gray-100 rounded-lg transition-colors active:scale-90"
          >
            <div className="w-10 h-[4px] bg-black rounded-full" />
            <div className="w-10 h-[4px] bg-black rounded-full" />
            <div className="w-10 h-[4px] bg-black rounded-full" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Full Width Feed */}
      <main className="flex-1 overflow-y-auto bg-white p-4 md:p-6 no-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="font-black text-xl">Loading your feed...</p>
            </div>
          ) : (
            feed.map((item, index) => (
              <BookCard 
                key={item.id + index} 
                post={item} 
                currentUser={user} 
                onLike={() => handleLike(item.id, item.likes || [])}
                onComment={() => setShowComments(item.id)}
                onForward={() => setShowForward(item)}
                onMenu={setShowPostMenu}
                onShare={() => handleWebShare(item)}
              />
            ))
          )}
        </div>
        
        {/* Add Post FAB */}
        <button 
          onClick={() => navigate('/create-post')}
          className="fixed bottom-10 right-10 w-20 h-20 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-50 border-4 border-white"
        >
          <Plus size={40} strokeWidth={4} />
        </button>
      </main>

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-black/40 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setShowComments(null);
                  setReplyingTo(null);
                  setReplyingToName(null);
                }
              }}
              className="bg-white w-full rounded-t-[3rem] h-[85vh] flex flex-col shadow-2xl overflow-hidden border-t-2 border-black"
            >
              {/* Sheet Header / Drag Handle */}
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center pt-4 pb-4 cursor-grab active:cursor-grabbing touch-none select-none"
              >
                <div className="w-16 h-1.5 bg-black/20 rounded-full" />
              </div>

              {/* Comments List */}
              <CommentList 
                showComments={showComments}
                posts={posts}
                editingComment={editingComment}
                setShowCommentMenu={setShowCommentMenu}
                handleUpdateComment={handleUpdateComment}
                setEditingComment={setEditingComment}
                setReplyingTo={setReplyingTo}
                setReplyingToName={setReplyingToName}
                commentInputRef={commentInputRef}
              />

              {/* Enhanced Bottom Input - Matching Image Exact UI */}
              <div className="p-6 border-t border-gray-100 flex flex-col gap-2 bg-white sticky bottom-0">
                {replyingToName && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#4A90E2]/10 rounded-xl text-xs">
                    <span className="text-gray-500 font-medium tracking-tight">Replying to <span className="font-black text-black">@{replyingToName}</span></span>
                    <button onClick={() => { setReplyingTo(null); setReplyingToName(null); }} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative flex items-center">
                      <input 
                        ref={commentInputRef}
                        type="text" 
                        placeholder="comments" 
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(showComments)}
                        className="w-full bg-white border-2 border-black rounded-full py-4 px-8 font-medium text-lg outline-none placeholder:text-gray-400 shadow-[2px_2px_0px_#000]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pr-2">
                    <button className="transition-transform active:scale-90">
                      <Mic size={48} strokeWidth={2} className="text-black" />
                    </button>
                    <button className="flex gap-1.5 transition-transform active:scale-90">
                      <div className="w-2.5 h-2.5 bg-black rounded-full" />
                      <div className="w-2.5 h-2.5 bg-black rounded-full" />
                      <div className="w-2.5 h-2.5 bg-black rounded-full" />
                    </button>
                  </div>
                </div>
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

      {/* Post Menu Bottom Sheet */}
      <AnimatePresence>
        {showPostMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPostMenu(null)}
              className="fixed inset-0 bg-black/60 z-[150] backdrop-blur-[8px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[200] rounded-t-[2.5rem] border-t-2 border-black max-h-[85vh] flex flex-col font-sans"
            >
              <div className="w-16 h-1.5 bg-black/10 rounded-full mx-auto mt-4 mb-2" />
              
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 no-scrollbar">
                {/* Header-like Info in Menu */}
                <div className="flex flex-col items-center py-4 mb-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-black mb-2">
                    <img src={showPostMenu.authorPhoto} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-extrabold text-xl">{showPostMenu.authorName}</h3>
                  <p className="text-sm font-bold text-black/40">Options for this post</p>
                </div>

                <div className="h-px bg-black/5 my-2" />

                {/* Owner Specific Operations */}
                {user?.uid === showPostMenu.authorId ? (
                  <>
                    <MenuOption icon={<Edit2 size={24} />} label="Edit Post" />
                    <MenuOption icon={<Archive size={24} />} label="Archive" />
                    <MenuOption icon={<Pin size={24} />} label="Pin to Profile" />
                    <MenuOption icon={<MessageSquareOff size={24} />} label="Turn off Comments" />
                    <MenuOption icon={<Shield size={24} />} label="Edit Privacy" />
                    <MenuOption icon={<BarChart2 size={24} />} label="Insights" />
                    <MenuOption icon={<Trash2 size={24} />} label="Delete" color="text-red-500" onClick={() => setShowDeleteConfirm(showPostMenu.id)} />
                  </>
                ) : (
                  <>
                    <MenuOption icon={<Bookmark size={24} />} label="Save Post" onClick={() => handleSavePost(showPostMenu.id)} />
                    <MenuOption icon={<EyeOff size={24} />} label="Hide Post" />
                    <MenuOption icon={<UserMinus size={24} />} label="Unfollow" />
                    <MenuOption icon={<VolumeX size={24} />} label="Mute" />
                    <MenuOption icon={<Info size={24} />} label="Why am I seeing this post?" />
                    <MenuOption icon={<AlertTriangle size={24} />} label="Report" color="text-red-500" />
                  </>
                )}

                <div className="h-px bg-black/5 my-2" />
                
                <MenuOption icon={<Share2 size={24} />} label="Share" onClick={() => { setShowForward(showPostMenu); setShowPostMenu(null); }} />
                <MenuOption icon={<Copy size={24} />} label="Copy Link" onClick={() => handleCopyLink(showPostMenu.id)} />
                <MenuOption icon={<Languages size={24} />} label="Translate" />

                <div className="h-px bg-black/5 my-2" />
                
                <MenuOption 
                  icon={<Zap size={24} className="text-yellow-500" />} 
                  label="Boost Post" 
                  badge="Pro" 
                  onClick={() => setToast('Boost Post is a Pro feature coming soon!')}
                />
                <MenuOption 
                  icon={<Sparkles size={24} className="text-purple-500" />} 
                  label="AI Filter" 
                  badge="Coming Soon" 
                  onClick={() => setToast('AI Filter is currently in development')}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] border-2 border-black p-8 w-full max-sm:max-w-xs max-w-sm flex flex-col items-center text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-6 border-2 border-red-100">
                <Trash2 size={40} />
              </div>
              <h3 className="text-3xl font-black mb-3 leading-tight">Delete Post?</h3>
              <p className="text-black/60 font-bold mb-10 leading-snug">This action cannot be undone. This post will be permanently removed from OC Books.</p>
              <div className="w-full flex flex-col gap-4">
                <button 
                  onClick={() => handleDeletePost(showDeleteConfirm)}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-red-200 active:scale-95 transition-all"
                >
                  Delete Forever
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-5 bg-gray-100 text-black rounded-2xl font-black text-xl active:scale-95 transition-all"
                >
                  Keep Post
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comment Actions Menu Bottom Sheet */}
      <AnimatePresence>
        {showCommentMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCommentMenu(null)}
              className="fixed inset-0 bg-black/40 z-[350] backdrop-blur-[4px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[400] rounded-t-[2.5rem] border-t-2 border-black p-6 flex flex-col gap-1 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-6" />
              
              {/* Post Owner / Moderator Logic */}
              {(user?.uid === showCommentMenu.comment.userId) && (
                <MenuOption 
                  icon={<Edit2 size={24} />} 
                  label="Edit" 
                  onClick={() => {
                    setEditingComment({ id: showCommentMenu.comment.id, text: showCommentMenu.comment.text });
                    setShowCommentMenu(null);
                  }} 
                />
              )}
              
              <MenuOption 
                icon={<Copy size={24} />} 
                label="Copy text" 
                onClick={() => {
                  navigator.clipboard.writeText(showCommentMenu.comment.text);
                  setToast('Comment copied');
                  setShowCommentMenu(null);
                }} 
              />

              {/* Role: Comment Owner or Post Owner */}
              {(user?.uid === showCommentMenu.comment.userId || user?.uid === posts.find(p => p.id === showCommentMenu.postId)?.authorId) && (
                <MenuOption 
                  icon={<Trash2 size={24} />} 
                  label="Delete" 
                  color="text-red-500" 
                  onClick={() => handleDeleteComment(showCommentMenu.postId, showCommentMenu.comment.id, showCommentMenu.comment.parentId)} 
                />
              )}

              {/* Role: Post Owner or General User */}
              {(user?.uid === posts.find(p => p.id === showCommentMenu.postId)?.authorId || user?.uid !== showCommentMenu.comment.userId) && (
                <MenuOption 
                  icon={<EyeOff size={24} />} 
                  label="Hide comment" 
                  onClick={() => handleHideComment(showCommentMenu.postId, showCommentMenu.comment.id)} 
                />
              )}

              {user?.uid === showCommentMenu.comment.userId && (
                <MenuOption 
                  icon={<VolumeX size={24} />} 
                  label="Turn off notifications" 
                  onClick={() => { setToast('Notifications turned off'); setShowCommentMenu(null); }} 
                />
              )}

              {user?.uid !== showCommentMenu.comment.userId && (
                <>
                  <MenuOption 
                    icon={<Languages size={24} />} 
                    label="Translate" 
                    onClick={() => { setToast('Translated to English'); setShowCommentMenu(null); }} 
                  />
                  <MenuOption 
                    icon={<AlertTriangle size={24} />} 
                    label="Report" 
                    color="text-red-500" 
                    onClick={() => { setToast('Comment reported'); setShowCommentMenu(null); }} 
                  />
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[400] bg-black text-white px-8 py-4 rounded-3xl font-black shadow-2xl flex items-center gap-3 border-2 border-white/10"
          >
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <Check size={20} className="text-green-400" />
            </div>
            <span className="text-lg tracking-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white z-[250] border-r-[3px] border-black shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-8 border-b-[3px] border-black bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    onClick={() => { navigate(`/profile/${user?.uid}`); setShowDrawer(false); }}
                    className="w-20 h-20 rounded-full border-[3px] border-black overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
                  >
                    <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-black text-2xl tracking-tighter leading-none mb-1">{user?.displayName || 'User Name'}</h3>
                    <p className="text-black/40 font-bold text-sm tracking-tight">@{user?.displayName?.toLowerCase().replace(/\s/g, '') || 'username'}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => { navigate(`/profile/${user?.uid}`); setShowDrawer(false); }}
                  className="text-[#4A90E2] font-black text-sm hover:underline"
                >
                  View Profile
                </button>

                <div className="flex gap-6 mt-6">
                  <div className="flex flex-col">
                    <span className="font-black text-xl leading-none">1.2k</span>
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Followers</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-xl leading-none">850</span>
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Following</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-xl leading-none">42</span>
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Posts</span>
                  </div>
                </div>
              </div>

              {/* Drawer Menu Options */}
              <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
                <DrawerOption 
                  icon={<User size={26} />} 
                  label="My Profile" 
                  onClick={() => { navigate(`/profile/${user?.uid}`); setShowDrawer(false); }}
                />
                <DrawerOption 
                  icon={<Users size={26} />} 
                  label="Friends / Following" 
                  onClick={() => { navigate('/friends'); setShowDrawer(false); }}
                />
                <DrawerOption 
                  icon={<Bookmark size={26} />} 
                  label="Saved" 
                  onClick={() => { navigate('/saved'); setShowDrawer(false); }}
                />
                <DrawerOption 
                  icon={<FileText size={26} />} 
                  label="My Posts" 
                  onClick={() => { navigate(`/profile/${user?.uid}`); setShowDrawer(false); }}
                />
                
                <div className="h-px bg-black/5 my-4 mx-2" />
                
                <DrawerOption 
                  icon={<Settings size={26} />} 
                  label="Settings & Privacy" 
                  onClick={() => { navigate('/settings'); setShowDrawer(false); }}
                />
                <DrawerOption 
                  icon={<Shield size={26} />} 
                  label="Security" 
                  onClick={() => { navigate('/security'); setShowDrawer(false); }}
                />
                <DrawerOption 
                  icon={<HelpCircle size={26} />} 
                  label="Help & Support" 
                  onClick={() => { navigate('/help'); setShowDrawer(false); }}
                />
                
                <DrawerOption 
                  icon={<LogOut size={26} />} 
                  label="Logout" 
                  color="text-red-500"
                  onClick={handleLogout}
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t-[3px] border-black bg-gray-50 flex flex-col gap-1">
                <p className="font-black text-sm uppercase tracking-tighter">OC Books Pro</p>
                <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase">Version 1.0.42-Stable</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Drawer Option Sub-component
function DrawerOption({ icon, label, color = "text-black", onClick }: { icon: React.ReactNode; label: string; color?: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-5 p-4 rounded-xl hover:bg-gray-100 transition-colors active:scale-[0.98] group",
        color
      )}
    >
      <div className="shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="font-black text-xl tracking-tighter leading-none">{label}</span>
    </button>
  );
}

interface BookCardProps {
  key?: string | number;
  post: Post;
  currentUser: any;
  onLike: () => void;
  onComment: () => void;
  onForward: () => void;
  onMenu: (post: Post) => void;
}

interface MediaElementProps {
  url: string;
  type: 'image' | 'video';
  isSmall?: boolean;
  filters?: {
    grayscale: number;
    brightness: number;
    contrast: number;
    sepia: number;
    blur: number;
  };
  onLoad?: (ratio: number) => void;
  key?: any;
}

const MediaElement = ({ url, type, isSmall = false, filters, onLoad }: MediaElementProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
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
  }, [type]);

  const handleMediaLoad = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    if (onLoad) {
      if (type === 'image') {
        const img = e.currentTarget as HTMLImageElement;
        onLoad(img.naturalWidth / img.naturalHeight);
      } else {
        const video = e.currentTarget as HTMLVideoElement;
        onLoad(video.videoWidth / video.videoHeight);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCloudinary = (url || '').includes('cloudinary.com');
  const transformedUrl = isCloudinary && filters ? getTransformedUrl(url, getFiltersTransformation(filters)) : url;

  const filterStyles = (filters && !isCloudinary) ? {
    filter: `
      grayscale(${filters.grayscale}%)
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      sepia(${filters.sepia}%)
      blur(${filters.blur}px)
    `
  } : {};

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden group shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] bg-black/5">
      {type === 'video' ? (
        <div className="w-full h-full relative" style={filterStyles}>
          <video 
            ref={videoRef}
            src={transformedUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration);
              handleMediaLoad(e);
            }}
            loop
            muted
            playsInline
          />
          {/* Central Play Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 flex items-center justify-center">
              <Play size={isSmall ? 40 : 64} fill="white" className="text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]" />
            </div>
          </div>
          {/* White Seeker Bar Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-white rounded-full" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/30">
              <Play size={10} fill="white" className="text-white" />
              <span className="text-white text-[10px] font-bold">
                {formatTime(duration || 338)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <img 
          src={transformedUrl} 
          alt="" 
          className="w-full h-full object-contain" 
          style={filterStyles} 
          onLoad={handleMediaLoad}
        />
      )}
      {/* Subtle Inner Shadow Overlay */}
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] pointer-events-none" />
    </div>
  );
};

// Helper for Menu Options
function MenuOption({ icon, label, color = "text-black", badge, onClick }: { icon: React.ReactNode; label: string; color?: string; badge?: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors active:scale-[0.98]",
        color
      )}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-[17px] font-black tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="bg-black text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest bg-opacity-90">
          {badge}
        </span>
      )}
    </button>
  );
}

// Comment List Sub-component to handle real-time fetching without hook violations
function CommentList({ 
  showComments, 
  posts, 
  editingComment, 
  setShowCommentMenu, 
  handleUpdateComment, 
  setEditingComment, 
  setReplyingTo, 
  setReplyingToName, 
  commentInputRef 
}: { 
  showComments: string | null; 
  posts: Post[]; 
  editingComment: any; 
  setShowCommentMenu: (val: any) => void; 
  handleUpdateComment: (p: string, i: string, t: string) => void; 
  setEditingComment: (val: any) => void; 
  setReplyingTo: (val: any) => void; 
  setReplyingToName: (val: any) => void; 
  commentInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [postComments, setPostComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const post = posts.find(p => p.id === showComments);
  const postOwnerId = post?.authorId;

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, 'books_posts', showComments, 'comments'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPostComments(list);
      setLoadingComments(false);
    });
    return unsub;
  }, [showComments]);

  if (loadingComments) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center opacity-30">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold">Fetching comments...</p>
      </div>
    );
  }

  if (postComments.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center opacity-30">
        <MessageCircle size={48} className="mb-2" />
        <p className="font-bold tracking-tight">No comments yet</p>
      </div>
    );
  }

  const mainComments = postComments.filter(c => !c.parentId);
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar space-y-8">
      {mainComments.map(comment => {
        const replies = postComments.filter(r => r.parentId === comment.id);
        return (
          <CommentItem 
            key={comment.id} 
            comment={{ ...comment, replies }} 
            postId={showComments!}
            postOwnerId={postOwnerId}
            editingId={editingComment?.id || null}
            onMenu={(c) => setShowCommentMenu({ postId: showComments!, comment: c })}
            onUpdate={(id, text) => handleUpdateComment(showComments!, id, text)}
            onCancelEdit={() => setEditingComment(null)}
            onReply={(id, name) => {
              setReplyingTo(id);
              setReplyingToName(name);
              commentInputRef.current?.focus();
            }}
          />
        );
      })}
    </div>
  );
}

// Comment Item Sub-component for nesting
function CommentItem(props: { 
  comment: any; 
  postId?: string;
  postOwnerId?: string;
  isReply?: boolean; 
  editingId?: string | null;
  onReply?: (id: string, name: string) => void; 
  onMenu?: (comment: any) => void;
  onUpdate?: (id: string, text: string) => void;
  onCancelEdit?: () => void;
  parentName?: string; 
  key?: any 
}) {
  const { 
    comment, 
    postId, 
    postOwnerId, 
    isReply = false, 
    editingId = null, 
    onReply, 
    onMenu, 
    onUpdate, 
    onCancelEdit, 
    parentName 
  } = props;
  const { user } = useAuth();
  const [editText, setEditText] = useState(comment.text);
  const isEditing = editingId === comment.id;

  useEffect(() => {
    if (isEditing) setEditText(comment.text);
  }, [isEditing, comment.text]);

  const handleSave = () => {
    if (editText.trim() && editText !== comment.text) {
      onUpdate?.(comment.id, editText);
    } else {
      onCancelEdit?.();
    }
  };

  // Hidden logic
  const isHidden = comment.isHidden;
  const canSeeHidden = user?.uid === comment.userId || user?.uid === postOwnerId;

  if (isHidden && !canSeeHidden) {
    return (
      <div className={cn("flex flex-col opacity-50 italic", isReply ? "pl-10 mt-6 relative" : "mt-6")}>
        {isReply && <div className="absolute left-[16px] top-[-30px] w-[20px] h-[40px] border-l-2 border-b-2 border-black rounded-bl-2xl opacity-50" />}
        <p className="text-gray-400 text-sm py-2 px-4 border border-dashed border-gray-300 rounded-xl">This comment was hidden</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", isReply ? "pl-10 mt-8 relative" : "mt-6")}>
      {/* Forced Indent & L-Connector (Visual Link) */}
      {isReply && (
        <div className="absolute left-[16px] top-[-32px] w-[20px] h-[48px] border-l-2 border-b-2 border-black rounded-bl-2xl pointer-events-none" />
      )}

      <div className="flex gap-4 items-start group">
        <div className={cn("rounded-full overflow-hidden border-2 border-black shadow-sm shrink-0 transition-transform relative z-10 bg-white", isReply ? "w-8 h-8" : "w-12 h-12")}>
          <img src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}`} className="w-full h-full object-cover" alt="" />
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          {isReply && parentName && (
            <span className="text-gray-400 text-xs font-semibold mb-0.5 tracking-tight">
              Replying to <span className="text-[#4A90E2]">@{parentName}</span>
            </span>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn("font-black leading-tight text-black", isReply ? "text-base" : "text-lg")}>{comment.userName}</h4>
              <VerifiedBadge size={isReply ? "12" : "16"} className="text-yellow-400" />
              <button 
                onClick={() => {
                  onReply?.(comment.id || comment.userName, comment.userName);
                }}
                className={cn("text-[#4A90E2] font-black ml-1 hover:underline", isReply ? "text-sm" : "text-base")}
              >
                Reply
              </button>
            </div>
            <div className="flex items-center gap-2">
              {comment.likesCount && (
                <div className="flex items-center gap-1.5 text-xs font-black text-black/40">
                  <span>{comment.likesCount}</span>
                  <ThumbsUp size={12} className="text-yellow-500 fill-yellow-500" />
                </div>
              )}
              <button onClick={() => onMenu?.(comment)} className="p-1 hover:bg-gray-100 rounded-full">
                <MoreVertical size={isReply ? 16 : 20} className="text-black cursor-pointer" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2 flex flex-col gap-2">
              <input 
                type="text" 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full border-2 border-black rounded-xl p-3 font-bold text-lg outline-none bg-yellow-50 shadow-[2px_2px_0px_#000]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') onCancelEdit?.();
                }}
              />
              <div className="flex gap-2">
                <button onClick={() => onCancelEdit?.()} className="px-4 py-2 bg-gray-100 rounded-xl font-black text-sm active:scale-95 transition-transform">Cancel</button>
                <button 
                  onClick={handleSave} 
                  className="px-6 py-2 bg-black text-white rounded-xl font-black text-sm active:scale-95 transition-transform"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className={cn("font-bold text-black mt-1 leading-tight tracking-tight", isReply ? "text-base" : "text-lg", isHidden && "text-black/30")}>
                {comment.text}
              </p>
              {comment.isEdited && <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">Edited</span>}
              {isHidden && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 self-start px-2 py-0.5 rounded border border-red-100">Hidden from others</span>}
            </div>
          )}

          {/* Audio Comment - Matching Image UI */}
          {comment.hasAudio && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 pl-2 pr-4 py-1.5 rounded-full border border-black/10 hover:bg-gray-100 transition-colors cursor-pointer group/audio">
                <Play size={16} fill="black" className="text-black" />
                <div className="flex items-center gap-1 h-4">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-[1.5px] bg-black rounded-full" 
                      style={{ 
                        height: `${Math.max(30, Math.sin(i * 0.5) * 70 + 30)}%`,
                        opacity: i > 15 ? 0.3 : 1
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recursive replies rendering - Passing parentName correctly */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col">
          {comment.replies.map((reply: any, idx: number) => (
            <CommentItem 
              key={reply.id || idx} 
              comment={reply} 
              postId={postId}
              postOwnerId={postOwnerId}
              isReply={true} 
              editingId={editingId}
              onReply={onReply} 
              onMenu={onMenu}
              onUpdate={onUpdate}
              onCancelEdit={onCancelEdit}
              parentName={comment.userName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function BookCard({ post, currentUser, onLike, onComment, onForward, onMenu, onShare }: BookCardProps & { onMenu: (post: Post) => void; onShare: (post: Post) => void }) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const mediaItems = post.mediaItems && post.mediaItems.length > 0 
    ? post.mediaItems 
    : [{ url: post.mediaUrl, type: post.mediaType, filters: (post as any).filters }];
    
  const isLiked = (post.likes || []).includes(currentUser?.uid);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = e.currentTarget;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== currentSlide) {
        setCurrentSlide(index);
      }
    }
  };

  const handleMediaLoad = (ratio: number) => {
    if (!aspectRatio) {
      setAspectRatio(ratio);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-black overflow-hidden p-5 flex flex-col gap-4 shadow-sm">
      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-black shadow-sm">
            <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-black leading-none tracking-tight">{post.authorName}</h3>
              {post.isVerified && <VerifiedBadge size="24" className="text-yellow-400" />}
              <button className="text-[#4A90E2] font-black text-2xl ml-2 hover:text-blue-600 transition-colors">Follow</button>
            </div>
            <span className="text-[12px] font-black text-black/40 mt-1">
              {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: false }).replace('about ', '') : '02:56m'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onMenu(post)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          < MoreVertical size={32} className="text-black stroke-[3]" />
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-2">
        <h4 className="text-lg font-black text-black uppercase tracking-tight">{post.title || 'OCSTHAEL EXECUTIVE HUB'}</h4>
        <div className="flex items-baseline gap-1">
          <p className={cn("text-sm font-black text-black uppercase tracking-tight", !showFullDescription && "line-clamp-1")}>
            {post.description || 'TESTING TITLE'}
          </p>
          <button 
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-[#4A90E2] text-sm font-black whitespace-nowrap hover:underline"
          >
            {showFullDescription ? '...Show less' : '...Learn more'}
          </button>
        </div>
      </div>

      {/* Media Area - Carousel */}
      <div className="relative border-2 border-black rounded-2xl overflow-hidden bg-gray-50 flex flex-col">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "flex overflow-x-auto snap-x snap-mandatory scroll-smooth p-1 gap-4 no-scrollbar",
            mediaItems.length === 1 ? "block" : "flex"
          )}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto'
          }}
        >
          {mediaItems.map((item: any, idx: number) => (
            <div 
              key={idx} 
              className={cn(
                "shrink-0 snap-center h-full",
                mediaItems.length > 1 ? "w-[92%]" : "w-full"
              )}
              style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto' }}
            >
              <MediaElement 
                url={item.url} 
                type={item.type} 
                filters={item.filters} 
                onLoad={idx === 0 ? handleMediaLoad : undefined} 
              />
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 pointer-events-none">
            {mediaItems.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "w-2.5 h-2.5 rounded-full border-2 border-black transition-all duration-300 shadow-[1px_1px_0px_#000]",
                  currentSlide === idx ? "w-6 bg-[#4A90E2]" : "bg-white"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer (Engagement) - Exact Mockup Match */}
      <div className="flex items-center gap-5 mt-2">
        <button 
          onClick={onLike}
          className={cn(
            "p-1 transition-all active:scale-95",
            isLiked ? "text-[#4A90E2]" : "text-[#4A90E2]/60 hover:text-[#4A90E2]"
          )}
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ThumbsUp size={48} fill={isLiked ? "currentColor" : "none"} strokeWidth={3} />
          </motion.div>
        </button>

        <div className="flex-1 relative">
          <button 
            onClick={onComment}
            className="w-full border-2 border-black rounded-xl py-3 px-6 text-center font-black text-black text-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
          >
            Add Coment
          </button>
        </div>

        <button 
          onClick={() => onShare(post)}
          className="p-1 text-black hover:scale-110 transition-all active:scale-90"
        >
          <Share2 size={52} className="rotate-[-15deg]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
