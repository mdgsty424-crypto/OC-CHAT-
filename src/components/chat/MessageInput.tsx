import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Camera, Mic, Send, Loader2, X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface MessageInputProps {
  chatId: string;
}

export default function MessageInput({ chatId }: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!user || !chatId) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${user.uid}`]: isTyping
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    // Typing indicator logic
    updateTypingStatus(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateTypingStatus(false);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      // Send message with file URL
      const messageData = {
        chatId,
        senderId: user.uid,
        text: '',
        fileUrl: data.url,
        fileType: data.resource_type,
        type: data.resource_type === 'image' ? 'image' : 'file',
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: data.resource_type === 'image' ? '📷 Photo' : '📁 File',
        lastMessageTime: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;

    const messageData = {
      chatId,
      senderId: user.uid,
      text: text.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    setText('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Update chat last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text.trim(),
        lastMessageTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur-lg border-t border-border flex items-center gap-3 z-50">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="image/*,video/*,application/pdf"
      />
      
      <div className="flex items-center gap-2">
        <button className="p-2 text-muted hover:text-primary transition-colors">
          <Smile size={22} />
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-muted hover:text-primary transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Paperclip size={22} />}
        </button>
      </div>
      
      <div className="flex-1 relative">
        <input
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="w-full bg-background border border-border rounded-2xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
        >
          <Camera size={20} />
        </button>
      </div>

      {text.trim() ? (
        <button
          onClick={handleSend}
          className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-90"
        >
          <Send size={20} />
        </button>
      ) : (
        <button className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-90">
          <Mic size={20} />
        </button>
      )}
    </div>
  );
}
