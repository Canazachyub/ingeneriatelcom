export interface ContactForm {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}

export interface ContactSubmission extends ContactForm {
  id: string
  createdAt: Date
  status: 'pendiente' | 'respondido'
}
