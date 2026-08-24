export interface SerialMessage {
  type: 'system' | 'app' | 'error' | 'sent';
  text: string;
  timestamp: number;
}

export type SerialMessageType = SerialMessage['type'];
export type SerialMessageSink = (type: SerialMessageType, text: string) => void;
export type SerialChunkListener = ((chunk: string) => boolean) | null;