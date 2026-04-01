import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const type = searchParams.get('type') || 'audio';
  const callId = searchParams.get('callId');
  const isGroup = searchParams.get('isGroup') === 'true';

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
    <div 
      ref={containerRef} 
      className="w-screen h-screen bg-black"
      id="call-container"
    />
  );
}
