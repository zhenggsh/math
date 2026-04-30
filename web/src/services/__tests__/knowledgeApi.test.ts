import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      interceptors: {
        request: { use: vi.fn() },
      },
    }),
  },
}))

vi.mock('../auth.service', () => ({
  getToken: () => 'test-token',
}))

import { knowledgeApi, learningRecordApi } from '../knowledgeApi'

describe('knowledgeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getKnowledgeTree', () => {
    it('should fetch knowledge tree by textbookId', async () => {
      const mockData = [
        { id: 'kp-1', code: '1.1', level1: 'Algebra', importanceLevel: 'A' },
      ]
      mockGet.mockResolvedValue({ data: { data: mockData } })

      const result = await knowledgeApi.getKnowledgeTree('tb-1')

      expect(mockGet).toHaveBeenCalledWith('/knowledge-points', {
        params: { textbookId: 'tb-1' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('getKnowledgePointDetail', () => {
    it('should fetch knowledge point detail by id', async () => {
      const mockData = {
        id: 'kp-1',
        code: '1.1',
        content: 'Definition of set',
        data: { definition: 'A collection of objects' },
      }
      mockGet.mockResolvedValue({ data: { data: mockData } })

      const result = await knowledgeApi.getKnowledgePointDetail('kp-1')

      expect(mockGet).toHaveBeenCalledWith('/knowledge-points/kp-1')
      expect(result).toEqual(mockData)
    })
  })

  describe('searchKnowledgePoints', () => {
    it('should search knowledge points by keyword', async () => {
      const mockData = [{ id: 'kp-1', code: '1.1', level1: 'Algebra' }]
      mockGet.mockResolvedValue({ data: { data: mockData } })

      const result = await knowledgeApi.searchKnowledgePoints('algebra')

      expect(mockGet).toHaveBeenCalledWith('/knowledge-points/search', {
        params: { keyword: 'algebra' },
      })
      expect(result).toEqual(mockData)
    })
  })
})

describe('learningRecordApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLearningRecords', () => {
    it('should fetch all learning records', async () => {
      const mockData = [
        {
          id: 'lr-1',
          knowledgePointId: 'kp-1',
          durationMinutes: 30,
          masteryLevel: 'A',
        },
      ]
      mockGet.mockResolvedValue({ data: { data: mockData } })

      const result = await learningRecordApi.getLearningRecords()

      expect(mockGet).toHaveBeenCalledWith('/learning-records', {
        params: undefined,
      })
      expect(result).toEqual(mockData)
    })

    it('should fetch learning records by knowledgePointId', async () => {
      const mockData = [{ id: 'lr-1', knowledgePointId: 'kp-1', durationMinutes: 30 }]
      mockGet.mockResolvedValue({ data: { data: mockData } })

      const result = await learningRecordApi.getLearningRecords('kp-1')

      expect(mockGet).toHaveBeenCalledWith('/learning-records', {
        params: { knowledgePointId: 'kp-1' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('createLearningRecord', () => {
    it('should create a learning record', async () => {
      const mockData = { id: 'lr-1', knowledgePointId: 'kp-1', durationMinutes: 30 }
      mockPost.mockResolvedValue({ data: { data: mockData } })

      const payload = {
        knowledgePointId: 'kp-1',
        startTime: '2024-03-20T10:00:00Z',
        durationMinutes: 30,
        masteryLevel: 'A',
        notes: 'Test notes',
      }

      const result = await learningRecordApi.createLearningRecord(payload)

      expect(mockPost).toHaveBeenCalledWith('/learning-records', payload)
      expect(result).toEqual(mockData)
    })
  })
})
