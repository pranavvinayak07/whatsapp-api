export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_REQUIRED'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface OutboundTextMessage {
  recipient: string;
  text: string;
  quotedMessageId?: string;
}

export interface OutboundMediaMessage {
  recipient: string;
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  caption?: string;
  fileName?: string;
  mimeType?: string;
  quotedMessageId?: string;
}

export interface OutboundLocationMessage {
  recipient: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface OutboundContactMessage {
  recipient: string;
  fullName: string;
  phoneNumber: string;
  organization?: string;
}

export interface OutboundButton {
  id: string;
  label: string;
}

export interface OutboundInteractiveMessage {
  recipient: string;
  title: string;
  body: string;
  footer?: string;
  buttons: OutboundButton[];
  forceFallbackMenu?: boolean;
}

export interface OutboundReactionMessage {
  recipient: string;
  messageId: string;
  emoji: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
  status: 'SENT' | 'FAILED';
}
