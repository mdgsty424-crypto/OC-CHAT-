import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Message, Chat, User } from '../types';
import { getMessages, saveMessage, initDB } from '../lib/db';
import { useSettings } from '../hooks/useSettings';
import { ChevronLeft, Phone, Video, MoreVertical, Smile, Paperclip, Camera, Mic, Send, CheckCircle2 } from 'lucide-react';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { motion, AnimatePresence } from 'motion/react';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import { createCall } from '../lib/webrtc';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

import { useNotifications } from '../hooks/useNotifications';

import { useAppAssets } from '../hooks/useAppAssets';
import { cn } from '../lib/utils';

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { isMuted } = useSettings();
  const { settings: globalSettings } = useGlobalSettings();
  const assets = useAppAssets();
  const navigate = useNavigate();
  const { sendNotification } = useNotifications();
  const [chat, setChat] = useState<Chat | null>(null);
  
  // Audio pre-loading
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const prevTypingRef = useRef<{ [key: string]: boolean }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Pre-load sounds using local assets for zero delay
    const soundsToLoad = [
      { key: 'received', url: assets.received },
      { key: 'typing', url: assets.typing },
      { key: 'sticker', url: assets.received }, // Fallback to received if no sticker sound
    ];

    soundsToLoad.forEach(({ key, url }) => {
      const audio = new Audio(url);
      audio.load();
      audioRefs.current[key] = audio;
      console.log(`Pre-loaded chat sound: ${key} from ${url}`);
    });
  }, [assets]);

  const playSound = (soundName: string) => {
    if (isMuted) return;
    
    // Vibration logic
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const audio = audioRefs.current[soundName];
    if (audio) {
      console.log(`Playing sound: ${soundName}`);
      audio.currentTime = 0;
      audio.play().catch(e => {
        if (e.name === 'NotAllowedError') {
          console.warn(`Sound playback blocked (user interaction required): ${soundName}`);
        } else {
          console.error(`Sound error (${soundName}):`, e.message || e);
        }
      });
    } else {
      console.warn(`Sound not found or not loaded: ${soundName}`);
    }
  };
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    // Fetch user's chats for forwarding
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const chatsUnsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setUserChats(chatList);
    });

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

    let userUnsubscribe: (() => void) | undefined;

    // Fetch Chat info and listen for changes (typing indicator)
    const chatUnsubscribe = onSnapshot(doc(db, 'chats', id), (snapshot) => {
      if (snapshot.exists()) {
        const chatData = { id: snapshot.id, ...snapshot.data() } as Chat;
        setChat(chatData);

        // Typing Sound Logic: Play when OTHER user starts typing
        if (chatData.type === 'direct' && currentUser) {
          const otherId = chatData.participants.find(uid => uid !== currentUser.uid);
          if (otherId) {
            const isTyping = chatData.typing?.[otherId] || false;
            const wasTyping = prevTypingRef.current[otherId] || false;
            
            if (isTyping && !wasTyping) {
              console.log(`Other user (${otherId}) started typing. Playing sound.`);
              playSound('typing');
            }
            prevTypingRef.current[otherId] = isTyping;
          }
        }

        if (chatData.type === 'direct') {
          const otherId = chatData.participants.find(uid => uid !== currentUser.uid);
          if (otherId && !userUnsubscribe) {
            // Listen for other user's real-time status
            userUnsubscribe = onSnapshot(doc(db, 'users', otherId), (userDoc) => {
              if (userDoc.exists()) {
                setOtherUser({ ...userDoc.data(), uid: userDoc.id } as User);
              }
            });
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
      
      // Check for new messages from others
      if (msgs.length > messages.length) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId !== currentUser?.uid) {
          if (lastMsg.type === 'sticker') {
            playSound('sticker');
          } else {
            playSound('received');
          }
        }
      }

      setMessages(msgs);
      
      // Save to IndexedDB
      msgs.forEach(msg => saveMessage(msg as any));

      // Mark as read and seen
      if (currentUser) {
        updateDoc(doc(db, 'chats', id), {
          [`unreadCount.${currentUser.uid}`]: 0
        });
        
        // Mark unread messages as 'seen'
        snapshot.docs.forEach((msgDoc) => {
          const msgData = msgDoc.data() as Message;
          if (msgData.senderId !== currentUser.uid && msgData.status !== 'seen') {
            updateDoc(msgDoc.ref, { status: 'seen' }).catch(e => console.error("Error updating seen status:", e));
          }
        });
      }
    });

    return () => {
      if (userUnsubscribe) userUnsubscribe();
      chatUnsubscribe();
      messagesUnsubscribe();
      chatsUnsubscribe();
    };
  }, [id, currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat?.typing]);

  // Typing logic: Trigger, Timeout, and Cleanup
  useEffect(() => {
    if (!id || !currentUser) return;

    const setTypingStatus = async (isTyping: boolean) => {
      try {
        await updateDoc(doc(db, 'chats', id), {
          [`typing.${currentUser.uid}`]: isTyping
        });
      } catch (error) {
        // Silent fail for typing status
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      // Detect typing in any textarea or text input (like the MessageInput)
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text')) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTypingStatus(true);
        typingTimeoutRef.current = setTimeout(() => setTypingStatus(false), 2000);
      }
    };

    window.addEventListener('input', handleInput);

    return () => {
      window.removeEventListener('input', handleInput);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Cleanup on page leave
      setTypingStatus(false);
    };
  }, [id, currentUser?.uid]);

  // Cleanup typing status on message send
  useEffect(() => {
    if (messages.length > 0 && currentUser && id) {
      const lastMsg = messages[messages.length - 1];
      // If the last message was sent by me, clear my typing status immediately
      if (lastMsg.senderId === currentUser.uid) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        updateDoc(doc(db, 'chats', id), {
          [`typing.${currentUser.uid}`]: false
        }).catch(() => {});
      }
    }
  }, [messages.length, currentUser?.uid, id]);

  const handleCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !otherUser || !otherUser.uid) {
      console.error("Cannot start call: missing user data");
      return;
    }

    try {
      const callId = await createCall(
        currentUser.uid, 
        otherUser.uid, 
        type, 
        currentUser.displayName || 'User', 
        currentUser.photoURL || ''
      );

      // Trigger High-Priority Push Notification for Call
      sendNotification({
        targetUserId: otherUser.uid,
        title: `Incoming ${type === 'video' ? 'Video' : 'Audio'} Call`,
        message: `${currentUser.displayName || 'Someone'} is calling you...`,
        largeIcon: currentUser.photoURL || '',
        link: `${window.location.origin}/call-screen/${currentUser.uid}?type=${type}&callId=${callId}&mode=receiver`,
        priority: 'high',
        type: 'call',
        requireInteraction: true,
        data: { 
          chatId: id, 
          callId, 
          type: 'call', 
          callerId: currentUser.uid, 
          callType: type 
        },
        actions: [
          { id: 'accept', text: 'Accept', icon: 'ic_call' },
          { id: 'reject', text: 'Reject', icon: 'ic_close' }
        ]
      });
      
      const callUrl = `/call-screen/${otherUser.uid}?type=${type}&callId=${callId}&mode=caller`;
      navigate(callUrl);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call. Please try again.");
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!forwardingMessage || !currentUser) return;

    try {
      const newMessage = { ...forwardingMessage };
      delete (newMessage as any).id; // Remove original ID so addDoc generates a new one
      
      newMessage.chatId = targetChatId;
      newMessage.senderId = currentUser.uid;
      newMessage.timestamp = new Date().toISOString();
      newMessage.status = 'sent' as const;
      
      // Add forwardedFrom info
      if (!newMessage.forwardedFrom) {
        let originalSenderName = 'Unknown User';
        let originalSenderPhoto = undefined;
        
        if (forwardingMessage.senderId === currentUser.uid) {
          originalSenderName = currentUser.displayName || 'Unknown User';
          originalSenderPhoto = currentUser.photoURL;
        } else if (otherUser && forwardingMessage.senderId === otherUser.uid) {
          originalSenderName = otherUser.displayName || 'Unknown User';
          originalSenderPhoto = otherUser.photoURL;
        } else {
          // Fetch from Firestore if it's a group chat or not cached
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const userDoc = await getDoc(doc(db, 'users', forwardingMessage.senderId));
            if (userDoc.exists()) {
              originalSenderName = userDoc.data().displayName || 'Unknown User';
              originalSenderPhoto = userDoc.data().photoURL;
            }
          } catch (e) {
            console.error("Error fetching original sender:", e);
          }
        }

        newMessage.forwardedFrom = {
          uid: forwardingMessage.senderId,
          displayName: originalSenderName,
          photoURL: originalSenderPhoto
        };
      }

      addDoc(collection(db, 'chats', targetChatId, 'messages'), newMessage).catch(e => console.error("Error forwarding message:", e));
      
      updateDoc(doc(db, 'chats', targetChatId), {
        lastMessage: forwardingMessage.text || 'Forwarded message',
        lastMessageTime: new Date().toISOString(),
      }).catch(e => console.error("Error updating chat:", e));

      // Trigger Push Notification for forwarded message
      const targetChat = userChats.find(c => c.id === targetChatId);
      if (targetChat) {
        targetChat.participants.forEach(pid => {
          if (pid !== currentUser.uid) {
            sendNotification({
              targetUserId: pid,
              title: currentUser.displayName || 'New Message',
              message: `↪️ Forwarded: ${forwardingMessage.text || 'Message'}`,
              largeIcon: currentUser.photoURL || '',
              link: `${window.location.origin}/chat/${targetChatId}`,
              priority: 'high',
              type: 'message',
              data: { chatId: targetChatId, userId: currentUser.uid, type: 'chat' },
              actions: [
                { id: 'reply', text: 'Reply', icon: 'ic_reply' },
                { id: 'open', text: 'Open Chat', icon: 'ic_open' }
              ]
            });
          }
        });
      }

      setForwardingMessage(null);
      // alert('Message forwarded!'); // Removed alert to be less annoying
    } catch (error) {
      console.error("Error forwarding message:", error);
      alert('Failed to forward message');
    }
  };

  const isOtherTyping = chat?.typing && otherUser?.uid && chat.typing[otherUser.uid];

  const getThemeClass = () => {
    const themeToUse = currentUser?.preferences?.chatTheme || globalSettings.theme;
    switch (themeToUse) {
      case 'theme-gradient-waves': return 'bg-gradient-to-br from-[#5f2c82] via-[#49a09d] to-[#ff4b8b]';
      case 'theme-glass': return 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900';
      case 'theme-solid-dark': return 'bg-[#121212]';
      case 'theme-ocean': return 'bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]';
      default: return 'bg-background';
    }
  };

  return (
    <div className={cn("flex flex-col h-screen w-full relative", getThemeClass())}>
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
              className="bg-surface rounded-[2rem] p-6 w-full max-w-sm border border-border max-h-[80vh] flex flex-col"
            >
              <h3 className="text-xl font-black mb-2">Forward Message</h3>
              <p className="text-sm text-muted mb-4">Select a chat to forward this message to.</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 no-scrollbar">
                {userChats.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleForwardMessage(c.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-surface rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
                      {c.type === 'direct' ? (
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.participants.find(p => p !== currentUser?.uid) || c.id}`} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <img src={c.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`} alt="Group" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-sm truncate">{c.type === 'direct' ? 'Direct Message' : c.name}</h4>
                      <p className="text-xs text-muted truncate">{c.lastMessage}</p>
                    </div>
                  </button>
                ))}
                {userChats.length === 0 && (
                  <p className="text-center text-muted py-4 text-sm">No chats available.</p>
                )}
              </div>

              <button onClick={() => setForwardingMessage(null)} className="w-full py-3 bg-surface text-text rounded-2xl font-bold hover:opacity-80 transition-colors">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-border py-3 px-4 flex items-center justify-between z-50">
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
                loading="lazy"
              />
              {chat?.type === 'direct' && otherUser?.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <h2 className={cn("text-sm font-extrabold text-text truncate max-w-[120px]", globalSettings.userNameSize, globalSettings.fontWeight, globalSettings.fontFamily)}>
                  {chat?.type === 'direct' ? (otherUser?.displayName || 'User') : chat?.name}
                </h2>
                {chat?.type === 'direct' && otherUser?.verified && (
                  <VerifiedBadge className="w-4 h-4 ml-1" size={globalSettings.badgeSize} />
                )}
              </div>
              <span className={cn("text-[10px] font-medium text-muted uppercase tracking-wider", globalSettings.fontFamily)}>
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
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent pb-24 no-scrollbar"
      >
        {messages.map((msg) => {
          const replyMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined;
          return (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={msg.senderId === currentUser?.uid} 
            onReply={setReplyingTo}
            onForward={setForwardingMessage}
            onCall={handleCall}
            otherUserPhoto={chat?.type === 'direct' ? (otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || id}`) : undefined}
            replyMessage={replyMessage}
          />
          );
        })}
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
