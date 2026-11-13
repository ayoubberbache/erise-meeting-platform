// WebRTC Configuration with Public Google STUN servers (DTLS-SRTP encrypted by standard)
export const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export const getMediaStream = async (audio = true, video = true): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } : false,
      video: video ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      } : false,
    });
  } catch (error) {
    console.warn('getUserMedia failed with ideal constraints, trying basic constraints', error);
    return await navigator.mediaDevices.getUserMedia({ audio, video });
  }
};

export const getDisplayMediaStream = async (): Promise<MediaStream> => {
  return await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
      displaySurface: 'monitor',
    } as any,
    audio: true,
  });
};
