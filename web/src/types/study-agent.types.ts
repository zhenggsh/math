export type StudyMessageRole = 'user' | 'agent'

export type StudyMessageFeedback = 'positive' | 'negative' | null

export interface StudyMessage {
  id: string
  sessionId: string
  role: StudyMessageRole
  content: string
  followUps: string[]
  feedback: StudyMessageFeedback
  createdAt: string
}

export interface StudySession {
  id: string
  userId: string
  knowledgePointId: string
  title: string
  messages: StudyMessage[]
  createdAt: string
}

export interface CreateSessionRequest {
  knowledgePointId: string
  knowledgePointTitle: string
}

export interface CreateMessageRequest {
  content: string
}

export interface UpdateFeedbackRequest {
  feedback?: 'positive' | 'negative'
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
