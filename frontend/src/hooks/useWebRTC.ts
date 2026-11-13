import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant, SignalingPayload, UserProfile } from '../types';
import { rtcConfiguration, getMediaStream, getDisplayMediaStream } from '../lib/webrtc';

interface UseWebRTCOptions {
  roomCode: string;
  user: UserProfile;
  isHost: boolean;
  maxParticipants?: number;
  signalingUrl?: string;
  onError?: (msg: string) => void;
}

export function useWebRTC({
  roomCode,
  user,
  isHost,
  signalingUrl,
  onError,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await getMediaStream(true, true);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('Could not get audio/video permissions:', err.message);
      // Fallback empty stream
      const stream = new MediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraOff(true);
      return stream;
    }
  }, []);

  // Connect to Signaling Server
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    async function setup() {
      const stream = await initLocalStream();

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = signalingUrl || (import.meta.env.VITE_SIGNALING_WS_URL || `${wsProtocol}//${window.location.hostname}:8000/ws`);
      const targetUrl = `${wsHost}/${roomCode}/${user.id}`;

      try {
        ws = new WebSocket(targetUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          setRoomError(null);
          // Send join message
          ws?.send(
            JSON.stringify({
              type: 'join',
              room_code: roomCode,
              user_id: user.id,
              user_profile: {
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                role: isHost ? 'host' : 'participant',
              },
            })
          );
        };

        ws.onmessage = async (event) => {
          try {
            const data: SignalingPayload = JSON.parse(event.data);
            await handleSignalingMessage(data, stream);
          } catch (e) {
            console.error('Error handling signaling message:', e);
          }
        };

        ws.onerror = (e) => {
          console.warn('WebSocket signaling error or disconnected, running in mesh simulation mode:', e);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          if (event.code === 1008) {
            const msg = 'Meeting room capacity reached or admission rejected.';
            setRoomError(msg);
            if (onError) onError(msg);
          }
        };
      } catch (e: any) {
        console.warn('Could not establish live WebSocket signaling, using fallback room state:', e.message);
        setupFallbackRoom();
      }
    }

    setup();

    return () => {
      isMounted = false;
      // Cleanup streams
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
      // Cleanup peer connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      // Close socket
      if (ws) ws.close();
    };
  }, [roomCode, user.id]);

  // Handle incoming signaling packets
  const handleSignalingMessage = async (data: SignalingPayload, currentStream: MediaStream) => {
    switch (data.type) {
      case 'room_state':
      case 'user_joined':
      case 'user_left':
        if (data.participants) {
          // Merge with current participants
          setParticipants(
            data.participants.map((p) => ({
              ...p,
              is_local: p.user_id === user.id,
            }))
          );
        }
        break;

      case 'hand_raise':
        if (data.participants) {
          setParticipants(
            data.participants.map((p) => ({
              ...p,
              is_local: p.user_id === user.id,
            }))
          );
        }
        break;

      case 'host_action':
        // If target is local user, enforce the action
        if (data.target_id === user.id || !data.target_id) {
          if (data.action === 'mute') {
            toggleMute(true);
          } else if (data.action === 'unmute') {
            toggleMute(false);
          } else if (data.action === 'stop_camera') {
            toggleCamera(true);
          } else if (data.action === 'stop_screen') {
            stopScreenShare();
          }
        }
        if (data.participants) {
          setParticipants(
            data.participants.map((p) => ({
              ...p,
              is_local: p.user_id === user.id,
            }))
          );
        }
        break;

      case 'error':
        setRoomError(data.message || 'An error occurred');
        if (onError && data.message) onError(data.message);
        break;

      case 'offer':
        if (data.user_id && data.sdp) {
          await handleOffer(data.user_id, data.sdp, currentStream);
        }
        break;

      case 'answer':
        if (data.user_id && data.sdp) {
          await handleAnswer(data.user_id, data.sdp);
        }
        break;

      case 'candidate':
        if (data.user_id && data.candidate) {
          await handleCandidate(data.user_id, data.candidate);
        }
        break;
    }
  };

  // Fallback room participants setup for offline demo mode
  const setupFallbackRoom = () => {
    const initialParticipants: Participant[] = [
      {
        user_id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: isHost ? 'host' : 'participant',
        is_muted: isMuted,
        is_camera_off: isCameraOff,
        is_screen_sharing: false,
        raised_hand: false,
        is_local: true,
      },
      {
        user_id: 'usr_guest_demo_1',
        full_name: 'Sarah Connor (E-RISE Core)',
        avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=sarah',
        role: 'participant',
        is_muted: false,
        is_camera_off: false,
        is_screen_sharing: false,
        raised_hand: false,
        is_local: false,
      },
      {
        user_id: 'usr_guest_demo_2',
        full_name: 'Alex Vance (Tech Lead)',
        avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=alex',
        role: 'participant',
        is_muted: true,
        is_camera_off: false,
        is_screen_sharing: false,
        raised_hand: true,
        hand_raised_at: new Date(Date.now() - 60000).toISOString(),
        is_local: false,
      },
    ];
    setParticipants(initialParticipants);
  };

  // WebRTC P2P Handshake handlers
  const createPeerConnection = (targetUserId: string, currentStream: MediaStream): RTCPeerConnection => {
    let pc = peerConnections.current.get(targetUserId);
    if (pc) return pc;

    pc = new RTCPeerConnection(rtcConfiguration);
    peerConnections.current.set(targetUserId, pc);

    // Add local tracks
    currentStream.getTracks().forEach((track) => pc?.addTrack(track, currentStream));

    // Send ICE candidates to target
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'candidate',
            target_id: targetUserId,
            candidate: event.candidate.toJSON(),
          })
        );
      }
    };

    // Receive remote tracks
    pc.ontrack = (event) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === targetUserId ? { ...p, stream: event.streams[0] } : p
        )
      );
    };

    return pc;
  };

  const handleOffer = async (fromUserId: string, sdp: RTCSessionDescriptionInit, stream: MediaStream) => {
    const pc = createPeerConnection(fromUserId, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'answer',
          target_id: fromUserId,
          sdp: answer,
        })
      );
    }
  };

  const handleAnswer = async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  const handleCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // User Action Controls
  const toggleMute = (forceState?: boolean) => {
    const targetState = forceState !== undefined ? forceState : !isMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !targetState;
      });
    }
    setIsMuted(targetState);
    setParticipants((prev) =>
      prev.map((p) => (p.is_local ? { ...p, is_muted: targetState } : p))
    );
  };

  const toggleCamera = (forceState?: boolean) => {
    const targetState = forceState !== undefined ? forceState : !isCameraOff;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !targetState;
      });
    }
    setIsCameraOff(targetState);
    setParticipants((prev) =>
      prev.map((p) => (p.is_local ? { ...p, is_camera_off: targetState } : p))
    );
  };

  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'hand_raise',
          raised: nextState,
        })
      );
    } else {
      setParticipants((prev) =>
        prev.map((p) =>
          p.is_local
            ? {
                ...p,
                raised_hand: nextState,
                hand_raised_at: nextState ? new Date().toISOString() : undefined,
              }
            : p
        )
      );
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await getDisplayMediaStream();
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Listen for screen share stop from browser native button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setParticipants((prev) =>
        prev.map((p) => (p.is_local ? { ...p, is_screen_sharing: true } : p))
      );
    } catch (err: any) {
      console.warn('Screen share cancelled or failed:', err.message);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
    setParticipants((prev) =>
      prev.map((p) => (p.is_local ? { ...p, is_screen_sharing: false } : p))
    );
  };

  // Host Moderation Actions
  const hostMuteParticipant = (targetUserId: string, mute: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'host_action',
          action: mute ? 'mute' : 'unmute',
          target_id: targetUserId,
        })
      );
    } else {
      // Local demo sync
      setParticipants((prev) =>
        prev.map((p) => (p.user_id === targetUserId ? { ...p, is_muted: mute } : p))
      );
    }
  };

  const hostStopCamera = (targetUserId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'host_action',
          action: 'stop_camera',
          target_id: targetUserId,
        })
      );
    } else {
      setParticipants((prev) =>
        prev.map((p) => (p.user_id === targetUserId ? { ...p, is_camera_off: true } : p))
      );
    }
  };

  const hostStopScreen = (targetUserId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'host_action',
          action: 'stop_screen',
          target_id: targetUserId,
        })
      );
    } else {
      setParticipants((prev) =>
        prev.map((p) => (p.user_id === targetUserId ? { ...p, is_screen_sharing: false } : p))
      );
    }
  };

  const hostLowerHand = (targetUserId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.user_id === targetUserId ? { ...p, raised_hand: false, hand_raised_at: undefined } : p
      )
    );
  };

  return {
    localStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    participants,
    isConnected,
    roomError,
    toggleMute,
    toggleCamera,
    toggleHandRaise,
    startScreenShare,
    stopScreenShare,
    hostMuteParticipant,
    hostStopCamera,
    hostStopScreen,
    hostLowerHand,
  };
}
