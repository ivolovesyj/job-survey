export interface JobDetail {
  intro?: string
  main_tasks?: string
  requirements?: string
  preferred_points?: string
  benefits?: string
  work_conditions?: string
  raw_content?: string
}

export interface Job {
  id: string
  company: string
  company_image?: string
  company_type?: string | null
  title: string
  location: string
  score: number
  reason: string
  reasons?: string[]
  warnings?: string[]
  link: string
  source: string
  createdAt?: string
  crawledAt?: string
  description?: string
  info?: string
  detail?: JobDetail
  // 새 필드
  depth_ones?: string[]
  depth_twos?: string[]
  keywords?: string[]
  career_min?: number | null
  career_max?: number | null
  employee_types?: string[]
  deadline_type?: string
  end_date?: string | null
  is_new?: boolean  // 24시간 이내 크롤링된 공고
}

export interface JobFeedback {
  jobId: string
  feedback: 'like' | 'pass'
  createdAt: string
}
