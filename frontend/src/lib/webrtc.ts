// WebRTC Configuration with Public Google STUN servers (DTLS-SRTP encrypted)
export const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:turn.matrix.org:3478' },
    { urls: 'stun:relay.metered.ca:80' },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Creates a synthetic animated video + audio stream.
 * Used as a zero-fail fallback when physical camera/mic are unavailable,
 * locked by another application, or denied by browser permissions.
 */
export const createSyntheticStream = (label = 'E-RISE'): MediaStream => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  let hue = 180;
  let frame = 0;

  const draw = () => {
    if (!ctx) return;
    frame++;
    hue = (hue + 0.5) % 360;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative geometric ring
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((frame * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.strokeStyle = `hsl(${hue}, 70%, 55%)`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Center circular badge
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#0f766e';
    ctx.fill();

    // Center initial / label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2);

    // Bottom banner
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('E-RISE Meeting Stream', canvas.width / 2, canvas.height - 25);
  };

  const timer = setInterval(draw, 1000 / 30);
  draw();

  const canvasStream = canvas.captureStream(30);
  const videoTrack = canvasStream.getVideoTracks()[0];

  // Create silent/comfortable audio track via Web Audio API
  let audioTrack: MediaStreamTrack | null = null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.00001; // virtually silent, prevents audio track errors
      const dest = audioCtx.createMediaStreamDestination();
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      audioTrack = dest.stream.getAudioTracks()[0] || null;
    }
  } catch (e) {
    console.warn('Could not initialize fallback AudioContext track:', e);
  }

  const finalStream = new MediaStream();
  if (videoTrack) {
    // When track is stopped, clear the drawing interval
    const originalStop = videoTrack.stop.bind(videoTrack);
    videoTrack.stop = () => {
      clearInterval(timer);
      originalStop();
    };
    finalStream.addTrack(videoTrack);
  }
  if (audioTrack) {
    finalStream.addTrack(audioTrack);
  }

  return finalStream;
};

/**
 * Robust media acquisition function.
 * Attempts ideal constraints, falls back to relaxed, then single-track,
 * and finally creates a synthetic stream so the stream is never corrupt or empty.
 */
export const getMediaStream = async (
  wantAudio = true,
  wantVideo = true,
  fallbackLabel = 'User'
): Promise<MediaStream> => {
  // If user disabled both initially
  if (!wantAudio && !wantVideo) {
    return createSyntheticStream(fallbackLabel);
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('navigator.mediaDevices.getUserMedia is not supported on this browser');
    return createSyntheticStream(fallbackLabel);
  }

  // 1. Try audio + video with ideal constraints
  if (wantAudio && wantVideo) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          frameRate: { ideal: 30, min: 15 },
        },
      });
    } catch (err) {
      console.warn('Ideal audio+video constraints failed, trying basic audio+video:', err);
    }

    // 2. Try basic audio+video
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (err) {
      console.warn('Basic audio+video failed, attempting audio-only then video-only:', err);
    }
  }

  // 3. Try audio only
  let audioStream: MediaStream | null = null;
  if (wantAudio) {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Could not capture microphone audio:', err);
    }
  }

  // 4. Try video only
  let videoStream: MediaStream | null = null;
  if (wantVideo) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.warn('Could not capture webcam video:', err);
      }
    }
  }

  // Combine whatever hardware tracks we managed to acquire
  const combinedStream = new MediaStream();
  if (audioStream && audioStream.getAudioTracks().length > 0) {
    audioStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
  }
  if (videoStream && videoStream.getVideoTracks().length > 0) {
    videoStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
  }

  // If we have at least one real hardware track, return it!
  if (combinedStream.getTracks().length > 0) {
    // If video was missing but requested, add synthetic video track so camera isn't corrupt
    if (wantVideo && combinedStream.getVideoTracks().length === 0) {
      const synthetic = createSyntheticStream(fallbackLabel);
      if (synthetic.getVideoTracks()[0]) {
        combinedStream.addTrack(synthetic.getVideoTracks()[0]);
      }
    }
    return combinedStream;
  }

  // If all hardware requests failed or were denied, return synthetic stream
  console.info('Using synthetic media stream fallback for meeting preview');
  return createSyntheticStream(fallbackLabel);
};

/**
 * Capture screen sharing stream with system audio
 */
export const getDisplayMediaStream = async (): Promise<MediaStream> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen sharing is not supported by your browser.');
  }

  return await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
      displaySurface: 'monitor',
    } as any,
    audio: true,
  });
};
