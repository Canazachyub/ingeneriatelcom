export type JobCategory =
  | 'ingeniero-electrico'
  | 'ingeniero-telecomunicaciones'
  | 'ingeniero-civil'
  | 'contador'
  | 'abogado'
  | 'tecnico-electricista'
  | 'tecnico-telecomunicaciones'
  | 'administrativo'
  | 'recursos-humanos'
  | 'marketing'
  | 'otros'

export type JobModality = 'presencial' | 'remoto' | 'hibrido'
export type JobStatus = 'activo' | 'pausado' | 'cerrado'
export type JobPriority = 'normal' | 'urgente'
export type ApplicationStatus = 'pendiente' | 'revisado' | 'entrevista' | 'rechazado' | 'contratado'

export interface JobPosting {
  id: string
  title: string
  category: JobCategory
  description: string
  requirements: string[]
  benefits: string[]
  location: string
  modality: JobModality
  salary?: {
    min: number
    max: number
    currency: 'PEN' | 'USD'
  }
  status: JobStatus
  priority: JobPriority
  publishedAt: Date
  closingDate?: Date
  applicationsCount: number
}

export interface JobApplication {
  id: string
  jobId: string
  applicant: {
    fullName: string
    email: string
    phone: string
    dni: string
    linkedIn?: string
  }
  cvFileUrl: string
  cvFileName: string
  coverLetter?: string
  expectedSalary?: number
  availability: string
  appliedAt: Date
  status: ApplicationStatus
}

export interface JobFilters {
  search: string
  category: JobCategory | ''
  location: string
  modality: JobModality | ''
}

export const JOB_CATEGORIES: Record<JobCategory, string> = {
  'ingeniero-electrico': 'Ingeniero Electrico',
  'ingeniero-telecomunicaciones': 'Ingeniero Telecomunicaciones',
  'ingeniero-civil': 'Ingeniero Civil',
  'contador': 'Contador',
  'abogado': 'Abogado',
  'tecnico-electricista': 'Tecnico Electricista',
  'tecnico-telecomunicaciones': 'Tecnico Telecomunicaciones',
  'administrativo': 'Administrativo',
  'recursos-humanos': 'Recursos Humanos',
  'marketing': 'Marketing',
  'otros': 'Otros',
}

export const JOB_MODALITIES: Record<JobModality, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Hibrido',
}
