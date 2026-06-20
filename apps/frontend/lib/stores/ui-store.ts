import { create } from "zustand"

type DialogName = "account" | "template" | "submission" | "submitter" | null

type UiState = {
  activeDialog: DialogName
  sidebarOpen: boolean
  setActiveDialog: (dialog: DialogName) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeDialog: null,
  sidebarOpen: true,
  setActiveDialog: (activeDialog) => set({ activeDialog }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
