import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Message, Chat, User } from '../types';
import { getMessages, saveMessage, initDB } from '../lib/db';
import { ChevronLeft, Phone, Video, MoreVertical, Smile, Paperclip, Camera, Mic, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';

import { useNotifications } from '../hooks/useNotifications';

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { sendNotification } = useNotifications();
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    // Load from IndexedDB first
    const loadLocalData = async () => {
      const localMessages = await getMessages(id);
      if (localMessages.length > 0) {
        setMessages(localMessages as any);
      }
      const dbInstance = await initDB();
      const localChat = await dbInstance.get('chats', id);
      if (localChat) {
        setChat(localChat as any);
        if (localChat.type === 'direct') {
          const otherId = localChat.participants.find((uid: string) => uid !== currentUser.uid);
          if (otherId) {
            const localOtherUser = await dbInstance.get('users', otherId);
            if (localOtherUser) {
              setOtherUser(localOtherUser as any);
            }
          }
        }
      }
    };
    loadLocalData();

    // Fetch Chat info and listen for changes (typing indicator)
    const chatUnsubscribe = onSnapshot(doc(db, 'chats', id), (snapshot) => {
      if (snapshot.exists()) {
        const chatData = { id: snapshot.id, ...snapshot.data() } as Chat;
        setChat(chatData);

        if (chatData.type === 'direct') {
          const otherId = chatData.participants.find(uid => uid !== currentUser.uid);
          if (otherId) {
            // Listen for other user's real-time status
            const userUnsubscribe = onSnapshot(doc(db, 'users', otherId), (userDoc) => {
              if (userDoc.exists()) {
                setOtherUser({ ...userDoc.data(), uid: userDoc.id } as User);
              }
            });
            return () => userUnsubscribe();
          }
        }
      }
    });

    // Fetch Messages
    const q = query(
      collection(db, 'chats', id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const messagesUnsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      
      // Save to IndexedDB
      msgs.forEach(msg => saveMessage(msg as any));

      // Mark as read and seen
      if (currentUser) {
        updateDoc(doc(db, 'chats', id), {
          [`unreadCount.${currentUser.uid}`]: 0
        });
        
        // Mark unread messages as 'seen'
        snapshot.docs.forEach(async (msgDoc) => {
          const msgData = msgDoc.data() as Message;
          if (msgData.senderId !== currentUser.uid && msgData.status !== 'seen') {
            await updateDoc(msgDoc.ref, { status: 'seen' });
          }
        });
      }
    });

    return () => {
      chatUnsubscribe();
      messagesUnsubscribe();
    };
  }, [id, currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat?.typing]);

  const handleCall = async (type: 'audio' | 'video') => {
    console.log("handleCall called", { currentUser, otherUser });
    if (!currentUser || !otherUser) {
      console.error("Cannot start call: currentUser or otherUser is missing", { currentUser, otherUser });
      return;
    }
    if (!otherUser.uid) {
      console.error("Cannot start call: otherUser.uid is missing", { otherUser });
      return;
    }

    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        type,
        callerId: currentUser.uid,
        receiverId: otherUser.uid,
        status: 'calling',
        timestamp: new Date().toISOString()
      });

      // Send VoIP Push Notification
      sendNotification({
        targetUserId: otherUser.uid,
        title: `Incoming ${type === 'video' ? 'Video' : 'Audio'} Call from ${currentUser.displayName || 'Someone'}`,
        message: "Tap the 'Answer' button to join the call.",
        image: currentUser.photoURL || '',
        priority: 'high',
        requireInteraction: true,
        sound: 'ringtone', // Custom ringtone file name (without extension)
        actions: [
          { 
            label: "✅ Answer", 
            action: "open_url", 
            url: `https://occhat.ocsthael.com/call/${currentUser.uid}?type=${type}&callId=${callRef.id}&chatId=${id}` 
          },
          { 
            label: "❌ Decline", 
            action: "dismiss" 
          }
        ]
      });

      navigate(`/call/${otherUser.uid}?type=${type}&callId=${callRef.id}&chatId=${id}`);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call");
    }
  };

  const handleForward = (message: Message) => {
    setForwardingMessage(message);
  };

  const isOtherTyping = chat?.typing && otherUser?.uid && chat.typing[otherUser.uid];

  return (
    <div className="flex flex-col h-screen bg-white w-full relative">
      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-xs border border-gray-100"
            >
              <h3 className="text-xl font-black mb-6">Forward Message</h3>
              <p className="text-sm text-muted mb-6">Select a chat to forward this message to.</p>
              <button onClick={() => setForwardingMessage(null)} className="w-full py-3 bg-border text-text rounded-2xl font-bold">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-white border-b border-gray-100 py-3 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-border rounded-full transition-colors">
            <ChevronLeft size={24} className="text-text" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={chat?.type === 'direct' ? (otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || id}`) : chat?.photo}
                alt={chat?.type === 'direct' ? otherUser?.displayName : chat?.name}
                className="w-10 h-10 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
              {chat?.type === 'direct' && otherUser?.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-text truncate max-w-[120px]">
                {chat?.type === 'direct' ? (otherUser?.displayName || 'Loading...') : chat?.name}
              </h2>
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                {isOtherTyping ? (
                  <span className="text-primary animate-pulse">Typing...</span>
                ) : (
                  chat?.type === 'direct' ? (otherUser?.online ? 'Online' : 'Offline') : `${chat?.participants.length} members`
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleCall('audio')} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90">
            <Phone size={20} />
          </button>
          <button onClick={() => handleCall('video')} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90">
            <Video size={20} />
          </button>
          <button className="p-2 text-muted hover:bg-border rounded-full transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-white pb-24 no-scrollbar"
      >
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={msg.senderId === currentUser?.uid} 
            onReply={setReplyingTo}
            onForward={handleForward}
            onCall={handleCall}
            otherUserPhoto={chat?.type === 'direct' ? (otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || id}`) : undefined}
          />
        ))}
        {isOtherTyping && (
          <div className="flex items-center gap-2 text-muted text-[10px] font-medium uppercase tracking-widest pl-2">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-muted rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span>{otherUser?.displayName} is typing</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      {chat && (
        <MessageInput 
          chatId={id!} 
          participants={chat.participants} 
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      )}
    </div>
  );
}
