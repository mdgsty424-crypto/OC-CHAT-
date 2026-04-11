import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ZIM } from 'zego-zim-web';
import { useAuth } from '../../hooks/useAuth';
import { useZegoStore } from '../../hooks/useZegoStore';
import { useAppAssets } from '../../hooks/useAppAssets';

const appID = 1698335343;
const serverSecret = "d1647c6b9802ed758e1bf148914b80758d5b35061f3e8f76261c6187d55ab9fe";

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
        
        // Using AppSign method for instant authentication as requested
        // @ts-ignore
        const zp = ZegoUIKitPrebuilt.create(Number(appID), String(serverSecret), 'invitation_room', String(user.uid), String(user.displayName || user.uid));
        
        // Add ZIM plugin for signaling
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
            let roomID = data || 'default_room';
            try {
              const parsed = JSON.parse(data);
              if (parsed.roomID) roomID = parsed.roomID;
            } catch (e) {
              console.log("Data is not JSON, using as roomID:", data);
            }
            
            // Instead of setIncomingCall, navigate to CallScreen
            const targetUrl = `/call-screen/${caller.userID}?type=${callType === 1 ? 'video' : 'audio'}&roomID=${roomID}`;
            console.log("Navigating to:", targetUrl);
            window.location.href = targetUrl;
          },
          onConfirmDialogWhenSending: (callID, callees, callType, cancel) => {
            console.log("Custom Outgoing Call Dialog Triggered:", { callID, callees, callType });
            // Handled by navigation in ChatDetail/Calls
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
