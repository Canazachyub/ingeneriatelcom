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

// Application statuses - comprehensive list matching backend values
export type ApplicationStatus =
  | 'pending'      // Recibido (nuevo)
  | 'pendiente'    // Recibido (legacy)
  | 'review'       // En revision
  | 'revisado'     // En revision (legacy)
  | 'preseleccionado' // Preseleccionado
  | 'interview'    // Entrevista programada
  | 'entrevista'   // Entrevista programada (legacy)
  | 'evaluation'   // Evaluacion pendiente
  | 'evaluacion'   // Evaluacion pendiente (legacy)
  | 'approved'     // Aprobado
  | 'aprobado'     // Aprobado (legacy)
  | 'hired'        // Contratado
  | 'contratado'   // Contratado (legacy)
  | 'rejected'     // Rechazado
  | 'rechazado'    // Rechazado (legacy)
  | 'no_seleccionado' // No seleccionado

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

// JobApplication - matches backend 16-column structure:
// id, jobId, jobTitle, fullName, dni, email, phone, linkedIn, coverLetter, expectedSalary, availability, cvUrl, status, notes, createdAt, updatedAt
export interface JobApplication {
  id: string
  jobId: string
  jobTitle: string
  fullName: string
  dni: string
  email: string
  phone: string
  linkedIn?: string
  coverLetter?: string
  expectedSalary?: number | string
  availability: string
  cvUrl: string
  status: ApplicationStatus
  notes?: string
  createdAt: string
  updatedAt: string
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
