export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface FacebookPost {
  id: string
  message: string
  image?: string
  createdAt: Date
  url: string
  likes: number
  comments: number
}

export interface Statistic {
  value: number
  suffix?: string
  label: string
  icon: string
}

export interface NavItem {
  label: string
  href: string
  isExternal?: boolean
  children?: NavItem[]
}

export interface Service {
  id: string
  title: string
  description: string
  icon: string
}

export interface Client {
  id: string
  name: string
  logo: string
  description: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  image?: string
}
