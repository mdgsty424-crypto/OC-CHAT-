import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user || !containerRef.current) return;

    const meetingRef = doc(db, 'meetings', id);
    
    // Join meeting in Firestore
    updateDoc(meetingRef, {
      participants: arrayUnion(user.uid)
    });

    let zp: any = null;

    const unsubscribe = onSnapshot(meetingRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!zp) {
          const appID = 1698335343;
          const serverSecret = '827755ef5ec4c06648bc783998a6d0c2';
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

          // Host logic: The person who starts the session is the Host (Moderator).
          // If hostId is not set in Firestore, set it to the current user.
          const isHost = data.hostId === user.uid || !data.hostId;
          
          if (!data.hostId) {
            updateDoc(meetingRef, {
              hostId: user.uid
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
            maxUsers: 50,
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
        navigate('/calls');
      }
    });

    return () => {
      unsubscribe();
      if (zp) zp.destroy();
      updateDoc(meetingRef, {
        participants: arrayRemove(user.uid)
      });
    };
  }, [id, user, navigate]);

  return (
    <div 
      ref={containerRef} 
      className="w-screen h-screen bg-[#1a1a1a]"
      id="meeting-room-container"
    />
  );
}
