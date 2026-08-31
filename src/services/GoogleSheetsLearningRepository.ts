import type { LearningRepository } from './LearningRepository'
import type { Attempt, ConceptStatus } from '../types/learning'

/**
 * TODO: Google OAuth + Sheets API 연동.
 * Android/Capacitor 앱에서는 인증 토큰을 Android Keystore 기반 저장소로 보호합니다.
 */
export class GoogleSheetsLearningRepository implements LearningRepository {
  async getConceptStatus(_studentId: string): Promise<ConceptStatus[]> {
    return []
  }

  async saveAttempt(_attempt: Attempt): Promise<void> {
    throw new Error('Google Sheets 연결 전입니다.')
  }

  async saveConceptStatus(_studentId: string, _status: ConceptStatus): Promise<void> {
    throw new Error('Google Sheets 연결 전입니다.')
  }
}
