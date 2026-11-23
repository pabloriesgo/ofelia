export interface Note {
  date: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

/** RFC 9457 problem details body, as returned by Spring's `ProblemDetail`. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}
