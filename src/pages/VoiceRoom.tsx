import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Group } from '../types';

export default function VoiceRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user || !containerRef.current) return;

    const groupRef = doc(db, 'groups', id);
    
    // Join voice room in Firestore
    updateDoc(groupRef, {
      'voiceRoom.isActive': true,
      'voiceRoom.participants': arrayUnion(user.uid)
    });

    let zp: any = null;

    const unsubscribe = onSnapshot(groupRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Group;
        
        if (!zp) {
          const appID = 49448835;
          const serverSecret = 'YOUR_NEW_APP_SIGN_OR_SECRET';
          const roomID = id;
          const userID = user.uid;
          const userName = user.displayName || `User_${userID.slice(0, 4)}`;

          const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            roomID,
            userID,
            userName
          );

          zp = ZegoUIKitPrebuilt.create(kitToken);

          // Host logic: If no host is set, or if current user is the host
          const isHost = (data.voiceRoom as any)?.hostId === user.uid || !(data.voiceRoom as any)?.hostId;
          
          if (!(data.voiceRoom as any)?.hostId) {
            updateDoc(groupRef, {
              'voiceRoom.hostId': user.uid
            }).catch(e => console.error("Error updating hostId:", e));
          }

          zp.joinRoom({
            container: containerRef.current,
            scenario: {
              mode: (ZegoUIKitPrebuilt as any).LiveAudioRoom,
              config: {
                role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
              }
            },
            showScreenSharingButton: false,
            showTextChat: true,
            showUserList: true,
            showInviteToCohostButton: true,
            showRemoveCohostButton: true,
            showRequestToCohostButton: true,
            turnOnMicrophoneWhenJoining: isHost,
            turnOnCameraWhenJoining: false,
            showMyCameraToggleButton: false,
            showMyMicrophoneToggleButton: true,
            showAudioVideoSettingsButton: true,
            showRemoveUserButton: isHost,
            onLeaveRoom: () => {
              navigate(-1);
            },
          });
        }
      } else {
        navigate('/community');
      }
    });

    return () => {
      unsubscribe();
      if (zp) zp.destroy();
      updateDoc(groupRef, {
        'voiceRoom.participants': arrayRemove(user.uid)
      });
    };
  }, [id, user, navigate]);

  return (
    <div 
      ref={containerRef} 
      className="w-screen h-screen bg-background"
      id="voice-room-container"
    />
  );
}
