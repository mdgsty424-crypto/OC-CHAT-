import React, { useEffect } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ZIM } from 'zego-zim-web';
import { useAuth } from '../../hooks/useAuth';
import { useZegoStore } from '../../hooks/useZegoStore';

const appID = 1698335343;
const serverSecret = "827755ef5ec4c06648bc783998a6d0c2";

export default function ZegoCallInvitation() {
  const { user } = useAuth();
  const { setZp } = useZegoStore();

  useEffect(() => {
    if (!user) {
      setZp(null);
      return;
    }

    const initZego = async () => {
      try {
        console.log("Initializing Zego Call Invitation Service for user:", user.uid);
        
        // Generate Kit Token for Test
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          '', // Room ID is empty for invitation service
          user.uid,
          user.displayName || user.uid
        );

        // Create ZegoUIKitPrebuilt instance
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        
        // Add ZIM plugin for signaling
        zp.addPlugins({ ZIM });

        // Configure Call Invitation
        zp.setCallInvitationConfig({
          ringtoneConfig: {
            incomingCallUrl: '/assets/sounds/ringtone.mp3',
            outgoingCallUrl: '/assets/sounds/ringtone.mp3',
          },
          onIncomingCallReceived: (callID, caller, callType, callees) => {
            console.log("Incoming call received:", { callID, caller, callType, callees });
          },
          onIncomingCallCanceled: (callID, caller) => {
            console.log("Incoming call canceled:", { callID, caller });
          },
          onOutgoingCallAccepted: (callID, callee) => {
            console.log("Outgoing call accepted by:", callee);
          },
          onOutgoingCallRejected: (callID, callee) => {
            console.log("Outgoing call rejected by:", callee);
          },
          onOutgoingCallDeclined: (callID, callee) => {
            console.log("Outgoing call declined by:", callee);
          },
          onIncomingCallTimeout: (callID, caller) => {
            console.log("Incoming call timeout:", { callID, caller });
          },
          onOutgoingCallTimeout: (callID, callees) => {
            console.log("Outgoing call timeout for:", callees);
          },
          onCallInvitationEnded: (reason, data) => {
            console.log("Call invitation ended:", { reason, data });
          }
        });

        setZp(zp);
        console.log("Zego Call Invitation Service initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Zego Call Invitation Service:", error);
      }
    };

    initZego();

    return () => {
      // In a real app, you might want to destroy it on logout
      // But for HMR and component lifecycle, we should be careful
    };
  }, [user?.uid, setZp]);

  return null;
}
