import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

// ZegoCloud Configuration from User
const appID = 1698335343;
const server = 'wss://webliveroom1698335343-api.coolzcloud.com/ws';
// Note: ServerSecret should be kept on the server side for security.
// For this prototype, we're acknowledging its presence.
const serverSecret = '827755ef5ec4c06648bc783998a6d0c2';

let engine: ZegoExpressEngine | null = null;

export const initZego = async () => {
  if (engine) return engine;
  
  try {
    engine = new ZegoExpressEngine(appID, server);
    console.log("ZegoCloud Engine initialized successfully");
    return engine;
  } catch (error) {
    console.error("ZegoCloud init failed:", error);
    return null;
  }
};

export const startCall = async (roomId: string, userId: string, userName: string, isVideo: boolean = true) => {
  const zego = await initZego();
  if (!zego) return;

  try {
    // 1. Fetch token from backend
    const response = await fetch('/api/zego/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roomId })
    });

    if (!response.ok) throw new Error('Failed to fetch Zego token');
    const { token } = await response.json();
    
    // 2. Login to the room
    await zego.loginRoom(roomId, token, { userID: userId, userName }, { userUpdate: true });
    console.log(`Logged into room: ${roomId}`);

    // 2. Start publishing local stream
    const localStream = await zego.createStream({
      camera: {
        video: isVideo,
        audio: true
      }
    });
    
    // In a real app, you'd attach this stream to a video element
    // zego.startPublishingStream(streamID, localStream);

    return localStream;
  } catch (error) {
    console.error("ZegoCloud call start failed:", error);
    return null;
  }
};

export const endCall = async (roomId: string) => {
  if (engine) {
    engine.logoutRoom(roomId);
    console.log(`Logged out of room: ${roomId}`);
  }
};
