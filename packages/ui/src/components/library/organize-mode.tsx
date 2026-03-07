"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type OrganizeContext =
  | { type: "library" }
  | { type: "collection"; collectionId: string; collectionName: string }

interface OrganizeModeContextValue {
  isOrganizing: boolean
  selectedIds: Set<string>
  context: OrganizeContext
  enterOrganize: () => void
  exitOrganize: () => void
  toggle: (id: string) => void
  clearSelection: () => void
}

const OrganizeModeContext = createContext<OrganizeModeContextValue | null>(null)

interface OrganizeModeProviderProps {
  children: ReactNode
  context: OrganizeContext
}

export function OrganizeModeProvider({ children, context }: OrganizeModeProviderProps) {
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const enterOrganize = useCallback(() => {
    setIsOrganizing(true)
  }, [])

  const exitOrganize = useCallback(() => {
    setIsOrganizing(false)
    setSelectedIds(new Set())
  }, [])

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return (
    <OrganizeModeContext.Provider
      value={{ isOrganizing, selectedIds, context, enterOrganize, exitOrganize, toggle, clearSelection }}
    >
      {children}
    </OrganizeModeContext.Provider>
  )
}

export function useOrganizeMode(): OrganizeModeContextValue {
  const ctx = useContext(OrganizeModeContext)
  if (!ctx) {
    throw new Error("useOrganizeMode must be used within an OrganizeModeProvider")
  }
  return ctx
}
