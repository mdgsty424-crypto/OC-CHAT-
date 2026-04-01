import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [timer, setTimer] = useState(0);

  const type = searchParams.get('type') || 'audio';
  const callId = searchParams.get('callId');
  const chatId = searchParams.get('chatId');
  const isGroup = searchParams.get('isGroup') === 'true';

  useEffect(() => {
    if (id && !isGroup) {
      getDoc(doc(db, 'users', id)).then((docSnap) => {
        if (docSnap.exists()) {
          setOtherUser({ ...docSnap.data(), uid: docSnap.id } as User);
        }
      });
    }
  }, [id, isGroup]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    if (!currentUser || !containerRef.current) return;

    const appID = 1698335343;
    const serverSecret = '827755ef5ec4c06648bc783998a6d0c2';
    
    // For direct calls, use callId as roomID.
    const roomID = callId || id || 'default-room';
    const userID = currentUser.uid;
    const userName = currentUser.displayName || `User_${userID.slice(0, 4)}`;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      currentUser.displayName || `User_${userID.slice(0, 4)}`
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);

    zp.joinRoom({
      container: containerRef.current,
      showPreJoinView: false, // Disable pre-join screen
      scenario: {
        mode: isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall,
      },
      turnOnMicrophoneWhenJoining: true, // Auto-join with mic on
      turnOnCameraWhenJoining: true, // Auto-join with camera on
      showScreenSharingButton: true,
      showTextChat: true,
      showUserList: true,
      maxUsers: isGroup ? 50 : 2,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      layout: isGroup ? "Grid" : "Auto",
      showLayoutButton: isGroup,
      onLeaveRoom: async () => {
        if (callId) {
          try {
            await updateDoc(doc(db, 'calls', callId), {
              status: 'ended',
              endTime: new Date().toISOString()
            });
            
            // Add call history message to chat
            if (chatId) {
              await addDoc(collection(db, 'chats', chatId, 'messages'), {
                chatId,
                senderId: currentUser?.uid,
                type: 'call_history',
                status: 'ended',
                timestamp: new Date().toISOString(),
                callType: type,
                duration: timer
              });
            }
          } catch (error) {
            console.error("Error ending call:", error);
          }
        }
        // Navigate back to chat if possible
        navigate(-1);
      },
    });

    return () => {
      zp.destroy();
    };
  }, [currentUser, id, callId, type, isGroup, navigate]);

  return (
    <div className="w-screen h-screen bg-black relative">
      {/* Custom Header Overlay */}
      {!isGroup && otherUser && (
        <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <img 
              src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}`} 
              alt={otherUser.displayName}
              className="w-10 h-10 rounded-full border-2 border-white"
              referrerPolicy="no-referrer"
            />
            <span className="text-white font-bold text-lg">{otherUser.displayName}</span>
          </div>
          <div className="text-white font-mono text-lg bg-black/30 px-3 py-1 rounded-full">
            {formatTime(timer)}
          </div>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        id="call-container"
      />
    </div>
  );
}
