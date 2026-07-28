import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { connect } from "node:net";

const children = new Set();
let shuttingDown = false;

await startLocalRedis();

start("backend", "node", ["apps/backend/dist/main"], {
  PORT: process.env.BACKEND_PORT ?? process.env.PORT ?? "3001",
});

start(
  "frontend",
  "node",
  ["apps/frontend/node_modules/next/dist/bin/next", "start", "apps/frontend"],
  {
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
    PORT: process.env.FRONTEND_PORT ?? "3000",
  },
);

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? (signal ? 1 : 0);
    console.error(`${name} exited; stopping Signa runtime.`);
    stop(exitCode);
  });
}

async function startLocalRedis() {
  if (process.env.LOCAL_REDIS_ENABLED !== "true") {
    return;
  }

  const redisDirectory = "/data/redis";

  await mkdir(redisDirectory, { recursive: true });
  start("redis", "redis-server", [
    "--bind",
    "127.0.0.1",
    "--port",
    "6379",
    "--appendonly",
    "yes",
    "--dir",
    redisDirectory,
  ]);
  await waitForPort(6379);
}

async function waitForPort(port) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (await canConnect(port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Local Redis did not start on port ${port}.`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function stop(code) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGKILL");
    }
  }, 10_000).unref();

  Promise.all([...children].map((child) => waitForExit(child))).finally(() => {
    process.exit(code);
  });
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}
