export type SessionMode = 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  userId: string;
  questionId: string;
  mode: SessionMode;
  messages: Message[];
  userAnswer?: string;
  aiReview?: string;
  aiExplanation?: string;
  score?: number;
  completed: boolean;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  questionId: string;
  mode: SessionMode;
}

export interface SendMessageInput {
  content: string;
}

export interface SubmitAnswerInput {
  answer: string;
}
