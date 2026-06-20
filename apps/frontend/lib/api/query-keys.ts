export const queryKeys = {
  health: ["health"] as const,
  auth: {
    session: ["auth", "session"] as const,
  },
  account: {
    current: ["account", "current"] as const,
  },
  user: {
    current: ["user", "current"] as const,
  },
  templates: {
    all: ["templates"] as const,
    list: (params: Record<string, unknown>) =>
      ["templates", "list", params] as const,
    detail: (id: string) => ["templates", "detail", id] as const,
  },
  submissions: {
    all: ["submissions"] as const,
    list: (params: Record<string, unknown>) =>
      ["submissions", "list", params] as const,
    detail: (id: string) => ["submissions", "detail", id] as const,
  },
  submitters: {
    all: ["submitters"] as const,
    list: (params: Record<string, unknown>) =>
      ["submitters", "list", params] as const,
    detail: (id: string) => ["submitters", "detail", id] as const,
  },
} as const
