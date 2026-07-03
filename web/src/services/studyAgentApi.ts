import axios from 'axios'
import { getToken } from './auth.service'
import type {
  ApiResponse,
  CreateMessageRequest,
  CreateSessionRequest,
  StudyMessage,
  StudySession,
  UpdateFeedbackRequest,
} from '../types/study-agent.types'

const API_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000'

const api = axios.create({
  baseURL: `${API_URL}`,
})

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const studyAgentApi = {
  async createSession(data: CreateSessionRequest): Promise<StudySession> {
    const response = await api.post<ApiResponse<StudySession>>('/study-agent/sessions', data)
    return response.data.data
  },

  async getSession(sessionId: string): Promise<StudySession> {
    const response = await api.get<ApiResponse<StudySession>>(`/study-agent/sessions/${sessionId}`)
    return response.data.data
  },

  async sendMessage(sessionId: string, content: string): Promise<StudyMessage> {
    const data: CreateMessageRequest = { content }
    const response = await api.post<ApiResponse<StudyMessage>>(
      `/study-agent/sessions/${sessionId}/messages`,
      data
    )
    return response.data.data
  },

  async updateFeedback(
    messageId: string,
    feedback?: 'positive' | 'negative'
  ): Promise<void> {
    const data: UpdateFeedbackRequest = { feedback }
    await api.put(`/study-agent/messages/${messageId}/feedback`, data)
  },

  async regenerate(userMessageId: string): Promise<StudyMessage> {
    const response = await api.post<ApiResponse<StudyMessage>>(
      `/study-agent/messages/${userMessageId}/regenerate`
    )
    return response.data.data
  },
}

export default studyAgentApi
