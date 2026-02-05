import { Job, JobDetail } from './job'

export type ApplicationStatus =
  | 'passed' // 지원안함
  | 'pending' // 지원 예정
  | 'hold' // 보류
  | 'not_applying' // 미지원
  | 'applied' // 지원 완료
  | 'document_pass' // 서류 합격
  | 'interviewing' // 면접 중
  | 'final' // 최종 면접
  | 'rejected' // 불합격
  | 'accepted' // 합격
  | 'declined' // 제안 거절

export interface InterviewDate {
  date: string
  type: string
  note?: string
}

export type DocumentStatus =
  | 'existing' // 기존서류
  | 'needs_update' // 수정필요
  | 'needs_new' // 신규작성필요
  | 'ready' // 준비완료

export interface RequiredDocuments {
  resume?: DocumentStatus // 이력서
  cover_letter?: DocumentStatus // 자기소개서
  portfolio?: DocumentStatus // 포트폴리오
}

export interface SavedJob {
  id: string
  user_id: string
  job_id: string | null // null for external jobs
  source?: string
  company?: string
  title?: string
  location?: string
  link?: string
  deadline?: string | null
  score?: number
  reason?: string
  reasons?: string[]
  warnings?: string[]
  description?: string
  detail?: JobDetail | null
  created_at: string
  updated_at?: string
  // External job fields
  external_company?: string
  external_title?: string
  external_url?: string
  external_location?: string
  external_deadline?: string | null
  is_external?: boolean
  source_url?: string
  is_pinned?: boolean
  pin_order?: number | null
}

export interface ApplicationStatusData {
  id: string
  user_id: string
  saved_job_id: string
  status: ApplicationStatus
  applied_date?: string | null
  resume_version?: string | null
  cover_letter?: string | null
  notes?: string | null
  interview_dates?: InterviewDate[] | null
  required_documents?: RequiredDocuments | null
  created_at: string
  updated_at: string
}

export interface ApplicationWithJob extends ApplicationStatusData {
  saved_job: SavedJob
}
