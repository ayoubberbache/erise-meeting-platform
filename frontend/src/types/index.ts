export type UserStatus = 'online' | 'asleep' | 'dnd' | 'offline';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  status: UserStatus;
  status_message?: string;
  created_at?: string;
}

export type ParticipantRole = 'host' | 'co-host' | 'participant';

export interface Participant {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_camera_off: boolean;
  is_screen_sharing: boolean;
  raised_hand: boolean;
  hand_raised_at?: string;
  stream?: MediaStream;
  is_local?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  room_code: string;
  host_id: string;
  host_name?: string;
  max_participants: number;
  current_participants?: number;
  is_locked: boolean;
  is_ended: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_code: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
}

export type SignalingType =
  | 'join'
  | 'joined'
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'user_left'
  | 'user_joined'
  | 'host_action'
  | 'hand_raise'
  | 'room_state'
  | 'error';

export interface SignalingPayload {
  type: SignalingType;
  room_code?: string;
  user_id?: string;
  target_id?: string;
  user_profile?: Partial<UserProfile>;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  action?: 'mute' | 'unmute' | 'stop_camera' | 'stop_screen' | 'kick' | 'lock_room';
  raised?: boolean;
  participants?: Participant[];
  max_participants?: number;
  message?: string;
}
