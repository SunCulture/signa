import { spawn } from "node:child_process"

const children = new Set()
let shuttingDown = false

start("backend", ["apps/backend/dist/main"], {
  PORT: process.env.BACKEND_PORT ?? process.env.PORT ?? "3001",
})

start("frontend", ["apps/frontend/node_modules/next/dist/bin/next", "start", "apps/frontend"], {
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  PORT: process.env.FRONTEND_PORT ?? "3000",
})

process.on("SIGINT", () => stop(130))
process.on("SIGTERM", () => stop(143))

function start(name, args, env) {
  const child = spawn("node", args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  })

  children.add(child)

  child.on("exit", (code, signal) => {
    children.delete(child)

    if (shuttingDown) {
      return
    }

    const exitCode = code ?? (signal ? 1 : 0)
    console.error(`${name} exited; stopping Signa runtime.`)
    stop(exitCode)
  })
}

function stop(code) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const child of children) {
    child.kill("SIGTERM")
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGKILL")
    }
  }, 10_000).unref()

  Promise.all([...children].map((child) => waitForExit(child))).finally(() => {
    process.exit(code)
  })
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve)
  })
}
