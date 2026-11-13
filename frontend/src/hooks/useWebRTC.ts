import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant, UserProfile } from '../types';
import { rtcConfiguration, getMediaStream, getDisplayMediaStream } from '../lib/webrtc';
import { supabase } from '../lib/supabase';

interface UseWebRTCOptions {
  roomCode: string;
  user: UserProfile;
  isHost: boolean;
  maxParticipants?: number;
  onError?: (msg: string) => void;
}

export function useWebRTC({
  roomCode,
  user,
  isHost,
  maxParticipants = 10,
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

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const channelRef = useRef<any>(null);

  // Flush any queued ICE candidates for a peer once remote description is set
  const flushQueuedIceCandidates = useCallback(async (targetUserId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueue.current.get(targetUserId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding queued ICE candidate:', err);
        }
      }
      iceCandidateQueue.current.delete(targetUserId);
    }
  }, []);

  // Initialize or re-acquire local media stream
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await getMediaStream(true, true, user.full_name);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const hasAudio = stream.getAudioTracks().length > 0;
      const hasVideo = stream.getVideoTracks().length > 0;

      setIsMuted(!hasAudio);
      setIsCameraOff(!hasVideo);

      const selfParticipant: Participant = {
        user_id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: isHost ? 'host' : 'participant',
        is_muted: !hasAudio,
        is_camera_off: !hasVideo,
        is_screen_sharing: false,
        raised_hand: false,
        is_local: true,
        stream: stream,
      };

      setParticipants([selfParticipant]);
      return stream;
    } catch (err: any) {
      console.warn('Initial media capture warning:', err);
      return null;
    }
  }, [user.id, user.full_name, user.avatar_url, isHost]);

  // Peer Connection factory with persistent remote track caching
  const getOrCreatePeerConnection = useCallback(
    (targetUserId: string): RTCPeerConnection => {
      let pc = peerConnections.current.get(targetUserId);
      if (pc) return pc;

      pc = new RTCPeerConnection(rtcConfiguration);
      peerConnections.current.set(targetUserId, pc);

      // Attach tracks from current local media (or screen share if active)
      const currentStream = localStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          pc?.addTrack(track, currentStream);
        });
      }

      // Send local ICE candidates to target peer
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'candidate',
              sender_id: user.id,
              target_id: targetUserId,
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      // Handle incoming remote media tracks and store permanently in remoteStreamsRef
      pc.ontrack = (event) => {
        let stream = remoteStreamsRef.current.get(targetUserId);
        if (!stream) {
          stream = event.streams[0] || new MediaStream();
          remoteStreamsRef.current.set(targetUserId, stream);
        }

        // Add track if not already in stream
        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        const persistentStream = stream;
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === targetUserId ? { ...p, stream: persistentStream } : p
          )
        );
      };

      // Auto-recover from network drops / ICE disconnects
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.warn(`ICE connection failed with ${targetUserId}, attempting ICE restart...`);
          pc.restartIce();
        }
      };

      return pc;
    },
    [user.id]
  );

  // Send SDP Offer to a peer (called only when introducing a new connection)
  const sendOfferToPeer = useCallback(
    async (targetUserId: string) => {
      try {
        makingOfferRef.current.set(targetUserId, true);
        const pc = getOrCreatePeerConnection(targetUserId);

        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'offer',
              sender_id: user.id,
              target_id: targetUserId,
              sdp: offer,
            },
          });
        }
      } catch (err) {
        console.warn('Error sending offer to peer:', err);
      } finally {
        makingOfferRef.current.set(targetUserId, false);
      }
    },
    [getOrCreatePeerConnection, user.id]
  );

  // Main Room and Signaling Lifecycle via Supabase Realtime
  useEffect(() => {
    let isMounted = true;

    async function startMeetingSession() {
      await initLocalStream();

      // Subscribe to Supabase Realtime Channel dedicated to this roomCode
      const channel = supabase.channel(`meet_${roomCode}`, {
        config: {
          presence: { key: user.id },
          broadcast: { self: false },
        },
      });

      channelRef.current = channel;

      // 1. Presence Sync: tracks participant entries, leaves, and state changes
      channel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const presenceState = channel.presenceState();
        const activeUsers: Participant[] = [];

        // Always include self with local stream
        activeUsers.push({
          user_id: user.id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: isHost ? 'host' : 'participant',
          is_muted: isMuted,
          is_camera_off: isCameraOff,
          is_screen_sharing: isScreenSharing,
          raised_hand: isHandRaised,
          is_local: true,
          stream: localStreamRef.current || undefined,
        });

        // Loop over presence entries
        Object.keys(presenceState).forEach((key) => {
          if (key === user.id) return;
          const userPresences = presenceState[key] as any[];
          if (userPresences && userPresences.length > 0) {
            const remoteUser = userPresences[0];

            // Always read stream from persistent remoteStreamsRef cache
            const cachedStream = remoteStreamsRef.current.get(remoteUser.user_id);

            activeUsers.push({
              user_id: remoteUser.user_id,
              full_name: remoteUser.full_name,
              avatar_url: remoteUser.avatar_url,
              role: remoteUser.role || 'participant',
              is_muted: remoteUser.is_muted ?? false,
              is_camera_off: remoteUser.is_camera_off ?? false,
              is_screen_sharing: remoteUser.is_screen_sharing ?? false,
              raised_hand: remoteUser.raised_hand ?? false,
              hand_raised_at: remoteUser.hand_raised_at,
              is_local: false,
              stream: cachedStream,
            });

            // Initiate connection ONLY if peer connection does not exist yet!
            // This prevents duplicate offers on every presence update (which caused disconnections!)
            const existingPc = peerConnections.current.get(remoteUser.user_id);
            if (!existingPc || existingPc.connectionState === 'failed') {
              if (isHost || user.id < remoteUser.user_id) {
                sendOfferToPeer(remoteUser.user_id);
              }
            }
          }
        });

        // Clean up connections for peers who left the room
        peerConnections.current.forEach((pc, peerId) => {
          if (!activeUsers.some((u) => u.user_id === peerId)) {
            pc.close();
            peerConnections.current.delete(peerId);
            remoteStreamsRef.current.delete(peerId);
            iceCandidateQueue.current.delete(peerId);
          }
        });

        // Enforce maximum participant capacity
        if (activeUsers.length > maxParticipants) {
          const errText = `Room capacity of ${maxParticipants} reached.`;
          setRoomError(errText);
          if (onError) onError(errText);
        } else {
          setRoomError(null);
        }

        setParticipants(activeUsers);
      });

      // 2. WebRTC Signaling Broadcast with Perfect Negotiation Pattern
      channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }: any) => {
        if (!isMounted || payload.target_id !== user.id) return;

        try {
          const pc = getOrCreatePeerConnection(payload.sender_id);

          if (payload.type === 'offer') {
            const isPolite = user.id > payload.sender_id;
            const isColliding =
              pc.signalingState !== 'stable' ||
              makingOfferRef.current.get(payload.sender_id);

            // Glare resolution: impolite peer rejects offer collision
            if (isColliding) {
              if (!isPolite) {
                return;
              }
              // Polite peer rolls back
              await pc.setLocalDescription({ type: 'rollback' });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await flushQueuedIceCandidates(payload.sender_id, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'answer',
                sender_id: user.id,
                target_id: payload.sender_id,
                sdp: answer,
              },
            });
          } else if (payload.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushQueuedIceCandidates(payload.sender_id, pc);
            }
          } else if (payload.type === 'candidate') {
            if (payload.candidate) {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {
                  console.warn('addIceCandidate notice:', e);
                }
              } else {
                // Buffer ICE candidates until remote description arrives
                const queue = iceCandidateQueue.current.get(payload.sender_id) || [];
                queue.push(payload.candidate);
                iceCandidateQueue.current.set(payload.sender_id, queue);
              }
            }
          }
        } catch (e) {
          console.warn('Signaling message handling notice:', e);
        }
      });

      // 3. Host Remote Actions
      channel.on('broadcast', { event: 'host-action' }, ({ payload }: any) => {
        if (!isMounted) return;
        if (payload.target_id === user.id) {
          if (payload.action === 'mute') toggleMute(true);
          else if (payload.action === 'unmute') toggleMute(false);
          else if (payload.action === 'stop_camera') toggleCamera(true);
          else if (payload.action === 'stop_screen') stopScreenShare();
          else if (payload.action === 'lower_hand') setIsHandRaised(false);
        }
      });

      // Subscribe and broadcast initial presence
      channel.subscribe(async (status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            user_id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            role: isHost ? 'host' : 'participant',
            is_muted: isMuted,
            is_camera_off: isCameraOff,
            is_screen_sharing: isScreenSharing,
            raised_hand: isHandRaised,
          });
        }
      });
    }

    startMeetingSession();

    return () => {
      isMounted = false;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      remoteStreamsRef.current.clear();
      iceCandidateQueue.current.clear();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomCode, user.id]);

  // Sync state changes with Supabase Presence
  const updatePresence = useCallback(
    async (updates: {
      is_muted?: boolean;
      is_camera_off?: boolean;
      is_screen_sharing?: boolean;
      raised_hand?: boolean;
    }) => {
      if (channelRef.current && isConnected) {
        await channelRef.current.track({
          user_id: user.id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: isHost ? 'host' : 'participant',
          is_muted: updates.is_muted ?? isMuted,
          is_camera_off: updates.is_camera_off ?? isCameraOff,
          is_screen_sharing: updates.is_screen_sharing ?? isScreenSharing,
          raised_hand: updates.raised_hand ?? isHandRaised,
        });
      }
    },
    [channelRef, isConnected, user, isHost, isMuted, isCameraOff, isScreenSharing, isHandRaised]
  );

  // User Actions: Toggle Microphone
  const toggleMute = async (forceState?: boolean) => {
    const nextMuted = forceState !== undefined ? forceState : !isMuted;

    if (localStreamRef.current) {
      let audioTracks = localStreamRef.current.getAudioTracks();

      if (!nextMuted && audioTracks.length === 0) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = micStream.getAudioTracks()[0];
          if (newTrack) {
            localStreamRef.current.addTrack(newTrack);
            peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
              if (sender) {
                sender.replaceTrack(newTrack);
              } else {
                pc.addTrack(newTrack, localStreamRef.current!);
              }
            });
            audioTracks = [newTrack];
          }
        } catch (e) {
          console.warn('Microphone permission request failed:', e);
        }
      }

      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    setIsMuted(nextMuted);
    setParticipants((prev) =>
      prev.map((p) => (p.is_local ? { ...p, is_muted: nextMuted } : p))
    );
    updatePresence({ is_muted: nextMuted });
  };

  // User Actions: Toggle Camera
  const toggleCamera = async (forceState?: boolean) => {
    const nextCameraOff = forceState !== undefined ? forceState : !isCameraOff;

    if (localStreamRef.current) {
      let videoTracks = localStreamRef.current.getVideoTracks();

      if (!nextCameraOff && videoTracks.length === 0) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          const newVideoTrack = camStream.getVideoTracks()[0];
          if (newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack);
            peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(newVideoTrack);
              } else {
                pc.addTrack(newVideoTrack, localStreamRef.current!);
              }
            });
            videoTracks = [newVideoTrack];
          }
        } catch (e) {
          console.warn('Camera permission request failed:', e);
        }
      }

      videoTracks.forEach((track) => {
        track.enabled = !nextCameraOff;
      });
    }

    setIsCameraOff(nextCameraOff);
    setParticipants((prev) =>
      prev.map((p) =>
        p.is_local
          ? {
              ...p,
              is_camera_off: nextCameraOff,
              stream: localStreamRef.current || p.stream,
            }
          : p
      )
    );
    updatePresence({ is_camera_off: nextCameraOff });
  };

  // User Actions: Toggle Hand Raise
  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);

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

    updatePresence({ raised_hand: nextState });
  };

  // User Actions: Screen Sharing (Transmitted to all connected peers)
  const startScreenShare = async () => {
    try {
      const stream = await getDisplayMediaStream();
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // Hot-swap video track for all connected peers
      peerConnections.current.forEach(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
        } else if (screenTrack) {
          pc.addTrack(screenTrack, stream);
        }
      });

      setParticipants((prev) =>
        prev.map((p) =>
          p.is_local ? { ...p, is_screen_sharing: true, stream } : p
        )
      );

      await updatePresence({ is_screen_sharing: true });
    } catch (err: any) {
      console.warn('Screen share cancelled or failed:', err.message);
    }
  };

  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    // Revert back to local webcam video track for all connected peers
    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    peerConnections.current.forEach(async (pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) {
        await sender.replaceTrack(camTrack);
      }
    });

    setParticipants((prev) =>
      prev.map((p) =>
        p.is_local
          ? {
              ...p,
              is_screen_sharing: false,
              stream: localStreamRef.current || undefined,
            }
          : p
      )
    );

    await updatePresence({ is_screen_sharing: false });
  };

  // Host Moderation Actions
  const hostMuteParticipant = (targetUserId: string, mute: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'host-action',
        payload: {
          action: mute ? 'mute' : 'unmute',
          target_id: targetUserId,
        },
      });
    }
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === targetUserId ? { ...p, is_muted: mute } : p))
    );
  };

  const hostStopCamera = (targetUserId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'host-action',
        payload: {
          action: 'stop_camera',
          target_id: targetUserId,
        },
      });
    }
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === targetUserId ? { ...p, is_camera_off: true } : p))
    );
  };

  const hostStopScreen = (targetUserId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'host-action',
        payload: {
          action: 'stop_screen',
          target_id: targetUserId,
        },
      });
    }
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === targetUserId ? { ...p, is_screen_sharing: false } : p))
    );
  };

  const hostLowerHand = (targetUserId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'host-action',
        payload: {
          action: 'lower_hand',
          target_id: targetUserId,
        },
      });
    }
    setParticipants((prev) =>
      prev.map((p) =>
        p.user_id === targetUserId
          ? { ...p, raised_hand: false, hand_raised_at: undefined }
          : p
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
