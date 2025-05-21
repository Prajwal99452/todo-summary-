"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Todo } from "@/types/todo"
import TodoList from "./todo-list"
import TodoForm from "./todo-form"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { useToast } from "./ui/use-toast"
import { Input } from "./ui/input"
import { Loader2, Send, AlertTriangle, Database, HardDrive } from "lucide-react"
import ApiErrorFallback from "./api-error-fallback"
import {
  getLocalTodos,
  addLocalTodo,
  updateLocalTodo,
  deleteLocalTodo,
  getStorageState,
  setStorageState,
} from "@/lib/local-storage"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [summarizing, setSummarizing] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const { toast } = useToast()
  const [apiError, setApiError] = useState<string | null>(null)
  const [storageMode, setStorageMode] = useState<"database" | "localStorage">("database")

  useEffect(() => {
    initializeApp()

    // Try to get saved webhook URL from localStorage
    const savedWebhookUrl = localStorage.getItem("slackWebhookUrl")
    if (savedWebhookUrl) {
      setSlackWebhookUrl(savedWebhookUrl)
    }
  }, [])

  const initializeApp = async () => {
    setLoading(true)

    // Check if we have a storage state saved
    const storageState = getStorageState()

    if (storageState.initialized) {
      // If we've already initialized, use the saved mode
      setStorageMode(storageState.mode)

      if (storageState.mode === "localStorage") {
        // Load todos from localStorage
        setTodos(getLocalTodos())
        setLoading(false)
        return
      }
    }

    // Try to fetch todos from the database
    try {
      const response = await fetch("/api/todos")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error response:", response.status, errorData)

        // Check if the error is about the table not existing
        if (
          errorData.error?.includes('relation "public.todos" does not exist') ||
          (errorData.error?.includes("relation") && errorData.error?.includes("does not exist"))
        ) {
          // Fall back to localStorage
          setStorageMode("localStorage")
          setStorageState({ mode: "localStorage", initialized: true })
          setTodos(getLocalTodos())

          toast({
            title: "Using Local Storage",
            description: "Database table not found. Your todos will be stored in your browser.",
            variant: "warning",
          })

          setLoading(false)
          return
        }

        throw new Error(errorData.error || `Server responded with ${response.status}`)
      }

      // Database is working
      const data = await response.json()
      setTodos(Array.isArray(data) ? data : [])
      setStorageMode("database")
      setStorageState({ mode: "database", initialized: true })
    } catch (error) {
      console.error("Error fetching todos:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load todos. Please try again."

      // Check if the error is about the table not existing
      if (
        errorMessage.includes('relation "public.todos" does not exist') ||
        (errorMessage.includes("relation") && errorMessage.includes("does not exist"))
      ) {
        // Fall back to localStorage
        setStorageMode("localStorage")
        setStorageState({ mode: "localStorage", initialized: true })
        setTodos(getLocalTodos())

        toast({
          title: "Using Local Storage",
          description: "Database table not found. Your todos will be stored in your browser.",
          variant: "warning",
        })
      } else {
        setApiError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTodos = async () => {
    if (storageMode === "localStorage") {
      setTodos(getLocalTodos())
      return
    }

    setLoading(true)
    setApiError(null)
    try {
      const response = await fetch("/api/todos")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error response:", response.status, errorData)
        throw new Error(errorData.error || `Server responded with ${response.status}`)
      }

      const data = await response.json()
      setTodos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching todos:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load todos. Please try again."
      setApiError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (todo: { title: string; description?: string }) => {
    if (storageMode === "localStorage") {
      const newTodo = addLocalTodo(todo)
      setTodos([newTodo, ...todos])
      toast({
        title: "Success",
        description: "Todo added successfully (stored locally)",
      })
      return
    }

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(todo),
      })

      if (!response.ok) {
        throw new Error("Failed to add todo")
      }

      const newTodo = await response.json()
      setTodos([newTodo, ...todos])
      toast({
        title: "Success",
        description: "Todo added successfully",
      })
    } catch (error) {
      console.error("Error adding todo:", error)
      toast({
        title: "Error",
        description: "Failed to add todo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    if (storageMode === "localStorage") {
      const updatedTodo = updateLocalTodo(id, updates)
      if (updatedTodo) {
        setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)))
        toast({
          title: "Success",
          description: "Todo updated successfully (stored locally)",
        })
      }
      return
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update todo")
      }

      const updatedTodo = await response.json()
      setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)))
      toast({
        title: "Success",
        description: "Todo updated successfully",
      })
    } catch (error) {
      console.error("Error updating todo:", error)
      toast({
        title: "Error",
        description: "Failed to update todo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteTodo = async (id: string) => {
    if (storageMode === "localStorage") {
      const success = deleteLocalTodo(id)
      if (success) {
        setTodos(todos.filter((todo) => todo.id !== id))
        toast({
          title: "Success",
          description: "Todo deleted successfully (from local storage)",
        })
      }
      return
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete todo")
      }

      setTodos(todos.filter((todo) => todo.id !== id))
      toast({
        title: "Success",
        description: "Todo deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting todo:", error)
      toast({
        title: "Error",
        description: "Failed to delete todo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const summarizeAndSendToSlack = async () => {
    if (!slackWebhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a Slack webhook URL",
        variant: "destructive",
      })
      return
    }

    // Save webhook URL to localStorage
    localStorage.setItem("slackWebhookUrl", slackWebhookUrl)

    setSummarizing(true)
    try {
      // If using localStorage, we need to send the todos directly
      const pendingTodos = todos.filter((todo) => !todo.completed)

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slackWebhookUrl,
          // Include todos if using localStorage
          ...(storageMode === "localStorage" ? { todos: pendingTodos } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize todos")
      }

      toast({
        title: "Success",
        description: `Summary of ${data.todoCount} todos sent to Slack successfully!`,
      })
    } catch (error) {
      console.error("Error summarizing todos:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to summarize todos",
        variant: "destructive",
      })
    } finally {
      setSummarizing(false)
    }
  }

  const pendingTodos = todos.filter((todo) => !todo.completed)
  const completedTodos = todos.filter((todo) => todo.completed)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {storageMode === "localStorage" && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Using Local Storage</AlertTitle>
          <AlertDescription>
            Your todos are being stored in your browser's local storage because the database table wasn't found.{" "}
            <Link href="/setup-instructions" className="font-medium underline underline-offset-4">
              Learn how to set up the database
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {apiError ? (
        <ApiErrorFallback onRetry={fetchTodos} error={apiError} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add New Todo</CardTitle>
              <CardDescription>Create a new task to keep track of</CardDescription>
            </CardHeader>
            <CardContent>
              <TodoForm onSubmit={addTodo} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summarize & Send to Slack</CardTitle>
              <CardDescription>Generate an AI summary of your pending todos and send it to Slack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="url"
                    placeholder="Enter your Slack webhook URL"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={summarizeAndSendToSlack} disabled={summarizing || pendingTodos.length === 0}>
                    {summarizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Summarize & Send
                      </>
                    )}
                  </Button>
                </div>
                {pendingTodos.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending todos to summarize</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Your Todos</CardTitle>
                <CardDescription>Manage your tasks</CardDescription>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {storageMode === "database" ? (
                  <>
                    <Database className="h-3 w-3" /> Database
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3 w-3" /> Local Storage
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                  <TabsTrigger value="pending">Pending ({pendingTodos.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedTodos.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                  <TodoList todos={pendingTodos} onUpdate={updateTodo} onDelete={deleteTodo} loading={loading} />
                </TabsContent>

                <TabsContent value="completed">
                  <TodoList todos={completedTodos} onUpdate={updateTodo} onDelete={deleteTodo} loading={loading} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
