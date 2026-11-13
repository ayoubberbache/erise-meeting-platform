import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant, UserProfile, ChatMessage } from '../types';
import { rtcConfiguration, getMediaStream, getDisplayMediaStream } from '../lib/webrtc';
import { supabase } from '../lib/supabase';

interface UseWebRTCOptions {
  roomCode: string;
  user: UserProfile;
  isHost: boolean;
  maxParticipants?: number;
  onError?: (msg: string) => void;
  onSessionTerminated?: (reason: string) => void;
}

export function useWebRTC({
  roomCode,
  user,
  isHost,
  maxParticipants = 10,
  onError,
  onSessionTerminated,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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

      // Handle incoming remote media tracks and trigger cloned stream reference for React re-render
      pc.ontrack = (event) => {
        let stream = remoteStreamsRef.current.get(targetUserId);
        if (!stream) {
          stream = event.streams[0] || new MediaStream();
        }

        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        // Clone into fresh MediaStream object so React state reference updates and <video>/<audio> rebind
        const freshStream = new MediaStream(stream.getTracks());
        remoteStreamsRef.current.set(targetUserId, freshStream);

        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === targetUserId
              ? {
                  ...p,
                  stream: freshStream,
                  is_camera_off: freshStream.getVideoTracks().length === 0,
                }
              : p
          )
        );
      };

      // Auto-recover from network drops / ICE disconnects across different places
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.warn(`ICE connection failed with ${targetUserId}, restarting ICE...`);
          pc.restartIce();
        }
      };

      return pc;
    },
    [user.id]
  );

  // Send SDP Offer to a peer
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

      // Check if meeting was already ended in database
      try {
        const { data: mCheck } = await supabase
          .from('meetings')
          .select('is_ended')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (mCheck?.is_ended) {
          if (onSessionTerminated) {
            onSessionTerminated('This meeting has ended and is no longer available.');
          }
          return;
        }
      } catch {}

      // Load past chat messages from database
      try {
        const { data: meeting } = await supabase
          .from('meetings')
          .select('id')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (meeting?.id) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select(`
              id,
              sender_id,
              content,
              created_at,
              profiles:sender_id (full_name, avatar_url)
            `)
            .eq('meeting_id', meeting.id)
            .order('created_at', { ascending: true });

          if (msgs && isMounted) {
            setChatMessages(
              msgs.map((m: any) => ({
                id: m.id,
                room_code: roomCode,
                sender_id: m.sender_id,
                sender_name: m.profiles?.full_name || 'Participant',
                sender_avatar: m.profiles?.avatar_url,
                content: m.content,
                created_at: m.created_at,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Chat history load notice:', err);
      }

      // Subscribe to Supabase Realtime Channel dedicated to this roomCode
      const channel = supabase.channel(`meet_${roomCode}`, {
        config: {
          presence: { key: user.id },
          broadcast: { self: false },
        },
      });

      channelRef.current = channel;

      // 1. Presence Sync
      channel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const presenceState = channel.presenceState();
        const activeUsers: Participant[] = [];

        // Self with local stream
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

        // Remote participants
        Object.keys(presenceState).forEach((key) => {
          if (key === user.id) return;
          const userPresences = presenceState[key] as any[];
          if (userPresences && userPresences.length > 0) {
            const remoteUser = userPresences[0];
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

            // Initiate offer ONLY if peer connection does not exist yet
            const existingPc = peerConnections.current.get(remoteUser.user_id);
            if (!existingPc || existingPc.connectionState === 'failed') {
              if (isHost || user.id < remoteUser.user_id) {
                sendOfferToPeer(remoteUser.user_id);
              }
            }
          }
        });

        // Clean up connections for peers who left
        peerConnections.current.forEach((pc, peerId) => {
          if (!activeUsers.some((u) => u.user_id === peerId)) {
            pc.close();
            peerConnections.current.delete(peerId);
            remoteStreamsRef.current.delete(peerId);
            iceCandidateQueue.current.delete(peerId);
          }
        });

        if (activeUsers.length > maxParticipants) {
          const errText = `Room capacity of ${maxParticipants} reached.`;
          setRoomError(errText);
          if (onError) onError(errText);
        } else {
          setRoomError(null);
        }

        setParticipants(activeUsers);
      });

      // 2. WebRTC Signaling Broadcast
      channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }: any) => {
        if (!isMounted || payload.target_id !== user.id) return;

        try {
          const pc = getOrCreatePeerConnection(payload.sender_id);

          if (payload.type === 'offer') {
            const isPolite = user.id > payload.sender_id;
            const isColliding =
              pc.signalingState !== 'stable' ||
              makingOfferRef.current.get(payload.sender_id);

            if (isColliding) {
              if (!isPolite) return;
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

      // 3. Realtime In-Call Chat Broadcast (Instant cross-user delivery!)
      channel.on('broadcast', { event: 'chat-message' }, ({ payload }: any) => {
        if (!isMounted) return;
        const incomingMsg: ChatMessage = {
          id: payload.id || 'msg-' + Date.now(),
          room_code: roomCode,
          sender_id: payload.sender_id,
          sender_name: payload.sender_name || 'Participant',
          sender_avatar: payload.sender_avatar,
          content: payload.content,
          created_at: payload.created_at || new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, incomingMsg]);
      });

      // 4. Session Termination Broadcast (Host ends meeting for everyone)
      channel.on('broadcast', { event: 'session-terminated' }, ({ payload }: any) => {
        if (!isMounted) return;
        if (onSessionTerminated) {
          onSessionTerminated(payload?.reason || 'The host has ended the meeting for everyone.');
        }
      });

      // 5. Host Remote Actions
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

  // Send in-call chat message (Delivers instantly to all users via Broadcast & persists to DB)
  const sendChatMessage = async (content: string) => {
    if (!content.trim()) return;

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      room_code: roomCode,
      sender_id: user.id,
      sender_name: user.full_name,
      sender_avatar: user.avatar_url,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    // 1. Local append
    setChatMessages((prev) => [...prev, newMsg]);

    // 2. Realtime Broadcast to all connected participants
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMsg,
      });
    }

    // 3. Persist to Supabase Database
    try {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('room_code', roomCode)
        .maybeSingle();

      let meetingId = meeting?.id;
      if (!meetingId) {
        const { data: createdMeeting } = await supabase
          .from('meetings')
          .insert({
            title: 'E-RISE Meeting',
            room_code: roomCode,
            host_id: user.id,
            max_participants: maxParticipants,
            is_locked: false,
            is_ended: false,
          })
          .select('id')
          .maybeSingle();
        meetingId = createdMeeting?.id;
      }

      if (meetingId) {
        await supabase.from('chat_messages').insert({
          meeting_id: meetingId,
          sender_id: user.id,
          content: content.trim(),
        });
      }
    } catch (e) {
      console.warn('DB chat persistence note:', e);
    }
  };

  // Terminate meeting for all participants (Admin/Host action)
  const terminateMeeting = async (reason = 'The host has ended the meeting for all participants.') => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'session-terminated',
        payload: {
          ended_by: user.id,
          reason,
        },
      });
    }

    try {
      await supabase
        .from('meetings')
        .update({ is_ended: true, ended_at: new Date().toISOString() })
        .eq('room_code', roomCode);
    } catch (e) {
      console.warn('Meeting termination DB update note:', e);
    }
  };

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

  // User Actions: Screen Sharing
  const startScreenShare = async () => {
    try {
      const stream = await getDisplayMediaStream();
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];
      screenTrack.onended = () => {
        stopScreenShare();
      };

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
    chatMessages,
    sendChatMessage,
    terminateMeeting,
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
