import { AppEvent } from "./event.model";

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
}

export interface AiResponse {
  success: boolean;
  action: string;
  message: string;
  event?: AppEvent;
  events?: AppEvent[];
  deletedIds?: string[];
}