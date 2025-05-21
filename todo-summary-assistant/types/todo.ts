export interface Todo {
  id: string
  title: string
  description: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

export interface TodoFormData {
  title: string
  description?: string
}

export interface StorageState {
  mode: "database" | "localStorage"
  initialized: boolean
}
