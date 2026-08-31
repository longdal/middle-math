import type { Attempt, ConceptStatus } from '../types/learning'

export interface LearningRepository {
  getConceptStatus(studentId: string): Promise<ConceptStatus[]>
  saveAttempt(attempt: Attempt): Promise<void>
  saveConceptStatus(studentId: string, status: ConceptStatus): Promise<void>
}
