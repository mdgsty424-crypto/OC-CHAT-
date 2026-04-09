import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import ZIM from 'zego-zim-web';
import { useAuth } from '../../hooks/useAuth';
import { useZegoStore } from '../../hooks/useZegoStore';
import { useAppAssets } from '../../hooks/useAppAssets';

const appID = 1698335343;
const serverSecret = "827755ef5ec4c06648bc783998a6d0c2";

export default function ZegoCallInvitation() {
  const { user } = useAuth();
  const { setZp, setIncomingCall, setOutgoingCall } = useZegoStore();
  const assets = useAppAssets();

  const zegoInitialized = useRef(false);

  useEffect(() => {
    if (zegoInitialized.current || !user) return;
    zegoInitialized.current = true;

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
        (window as any).ZIM = ZIM;
        zp.addPlugins({ ZIM });

        // Configure Call Invitation
        zp.setCallInvitationConfig({
          enableCustomCallInvitationDialog: true, // Enable custom UI
          // @ts-ignore
          enableCustomOutgoingCallDialog: true, // Enable custom UI for outgoing
          enableNotifyWhenAppRunningInBackgroundOrQuit: true,
          // @ts-ignore - These might be newer or platform specific
          enableNotifyWhenAppIsRunning: true,
          enableForegroundService: true,
          showInRecentTasks: true,
          isContextRequired: true,
          ringtoneConfig: {
            incomingCallUrl: assets.ringtone,
            outgoingCallUrl: assets.ringtone,
          },
          onConfirmDialogWhenReceiving: (callType, caller, refuse, accept, data) => {
            console.log("Custom Incoming Call Dialog Triggered:", { callType, caller, data });
            // Instead of setIncomingCall, navigate to CallScreen
            window.location.href = `/call/${caller.userID}?type=${callType === 1 ? 'video' : 'audio'}&callId=${data}`;
          },
          onConfirmDialogWhenSending: (callID, callees, callType, cancel) => {
            console.log("Custom Outgoing Call Dialog Triggered:", { callID, callees, callType });
            // Already handled by navigation in ChatDetail
          },
          onIncomingCallReceived: (callID, caller, callType, callees) => {
            console.log("Incoming call received:", { callID, caller, callType, callees });
          },
          onIncomingCallCanceled: (callID, caller) => {
            console.log("Incoming call canceled:", { callID, caller });
            setIncomingCall(null);
          },
          onOutgoingCallAccepted: (callID, callee) => {
            console.log("Outgoing call accepted by:", callee);
            setOutgoingCall(null);
          },
          onOutgoingCallRejected: (callID, callee) => {
            console.log("Outgoing call rejected by:", callee);
            setOutgoingCall(null);
          },
          onOutgoingCallDeclined: (callID, callee) => {
            console.log("Outgoing call declined by:", callee);
            setOutgoingCall(null);
          },
          onIncomingCallTimeout: (callID, caller) => {
            console.log("Incoming call timeout:", { callID, caller });
            setIncomingCall(null);
          },
          onOutgoingCallTimeout: (callID, callees) => {
            console.log("Outgoing call timeout for:", callees);
            setOutgoingCall(null);
          },
          onCallInvitationEnded: (reason, data) => {
            console.log("Call invitation ended:", { reason, data });
            setIncomingCall(null);
            setOutgoingCall(null);
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
  }, [user?.uid, setZp, setIncomingCall]);

  return null;
}
