import type { Todo } from "@/types/todo"
import { v4 as uuidv4 } from "uuid"

const TODOS_KEY = "todos_local_storage"
const STORAGE_STATE_KEY = "todos_storage_state"

export type StorageMode = "database" | "localStorage"

export interface StorageState {
  mode: StorageMode
  initialized: boolean
}

// Get all todos from localStorage
export function getLocalTodos(): Todo[] {
  if (typeof window === "undefined") return []

  const todosJson = localStorage.getItem(TODOS_KEY)
  if (!todosJson) return []

  try {
    const todos = JSON.parse(todosJson)
    return Array.isArray(todos) ? todos : []
  } catch (error) {
    console.error("Error parsing todos from localStorage:", error)
    return []
  }
}

// Save todos to localStorage
export function saveLocalTodos(todos: Todo[]): void {
  if (typeof window === "undefined") return

  localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
}

// Add a new todo to localStorage
export function addLocalTodo(todo: { title: string; description?: string }): Todo {
  const todos = getLocalTodos()

  const newTodo: Todo = {
    id: uuidv4(),
    title: todo.title,
    description: todo.description || null,
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  todos.unshift(newTodo)
  saveLocalTodos(todos)

  return newTodo
}

// Update a todo in localStorage
export function updateLocalTodo(id: string, updates: Partial<Todo>): Todo | null {
  const todos = getLocalTodos()
  const index = todos.findIndex((todo) => todo.id === id)

  if (index === -1) return null

  const updatedTodo = {
    ...todos[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  todos[index] = updatedTodo
  saveLocalTodos(todos)

  return updatedTodo
}

// Delete a todo from localStorage
export function deleteLocalTodo(id: string): boolean {
  const todos = getLocalTodos()
  const filteredTodos = todos.filter((todo) => todo.id !== id)

  if (filteredTodos.length === todos.length) return false

  saveLocalTodos(filteredTodos)
  return true
}

// Get storage state
export function getStorageState(): StorageState {
  if (typeof window === "undefined") {
    return { mode: "database", initialized: false }
  }

  const stateJson = localStorage.getItem(STORAGE_STATE_KEY)
  if (!stateJson) {
    return { mode: "database", initialized: false }
  }

  try {
    return JSON.parse(stateJson)
  } catch (error) {
    return { mode: "database", initialized: false }
  }
}

// Set storage state
export function setStorageState(state: StorageState): void {
  if (typeof window === "undefined") return

  localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state))
}
