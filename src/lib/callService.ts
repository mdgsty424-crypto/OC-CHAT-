import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

// ZegoCloud Configuration from User
const appID = 1698335343;
const server = 'wss://webliveroom1698335343-api.coolzcloud.com/ws';

let engine: ZegoExpressEngine | null = null;

export const initZego = async () => {
  if (engine) return engine;
  
  try {
    engine = new ZegoExpressEngine(appID, server);
    console.log("ZegoCloud Engine initialized successfully");
    
    // Set up global event listeners if needed
    engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.log(`Room state update: ${roomID}, state: ${state}, errorCode: ${errorCode}`);
    });

    engine.on('roomUserUpdate', (roomID, updateType, userList) => {
      console.log(`Room user update: ${roomID}, type: ${updateType}`, userList);
    });

    return engine;
  } catch (error) {
    console.error("ZegoCloud init failed:", error);
    return null;
  }
};

export const startCall = async (roomId: string, userId: string, userName: string, isVideo: boolean = false) => {
  const zego = await initZego();
  if (!zego) return null;

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

    // 3. Create local stream
    const localStream = await zego.createStream({
      camera: {
        video: isVideo,
        audio: true
      }
    });
    
    // 4. Start publishing local stream
    zego.startPublishingStream(userId, localStream);
    
    return localStream;
  } catch (error) {
    console.error("ZegoCloud call start failed:", error);
    return null;
  }
};

export const endCall = async (roomId: string, stream?: MediaStream) => {
  if (engine) {
    if (stream) {
      engine.stopPublishingStream(stream.id);
      engine.destroyStream(stream);
    }
    engine.logoutRoom(roomId);
    console.log(`Logged out of room: ${roomId}`);
  }
};

export const startRecording = async (streamID: string) => {
  if (engine) {
    console.log("Starting recording for stream:", streamID);
  }
};

export const stopRecording = async (streamID: string) => {
  if (engine) {
    console.log("Stopping recording for stream:", streamID);
  }
};

export const muteMic = (isMuted: boolean) => {
  if (engine) {
    engine.muteMicrophone(isMuted);
  }
};

export const joinMeeting = async (roomId: string, userId: string, userName: string) => {
  const zego = await initZego();
  if (!zego) return null;

  try {
    const response = await fetch('/api/zego/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roomId })
    });

    if (!response.ok) throw new Error('Failed to fetch Zego token');
    const { token } = await response.json();
    
    await zego.loginRoom(roomId, token, { userID: userId, userName }, { userUpdate: true });
    console.log(`Joined meeting room: ${roomId}`);

    const localStream = await zego.createStream({
      camera: {
        video: true,
        audio: true
      }
    });
    
    zego.startPublishingStream(userId, localStream);
    
    return localStream;
  } catch (error) {
    console.error("ZegoCloud meeting join failed:", error);
    return null;
  }
};
