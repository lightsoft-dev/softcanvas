import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { stripVTControlCharacters } from 'node:util'
import treeKill from 'tree-kill'

export type DevServerFlavor = 'vite' | 'next' | 'expo' | 'auto'

export interface DevServerOptions {
  cwd: string
  command?: string
  flavor?: DevServerFlavor
  readyTimeoutMs?: number
}

// URL detection patterns — applied to ANSI-STRIPPED lines.
const PATTERNS: Record<Exclude<DevServerFlavor, 'auto'>, RegExp[]> = {
  vite: [/(?:➜\s*)?Local:\s+(https?:\/\/[^\s/]+(?::\d+)?)\/?/i],
  next: [
    /-?\s*Local:\s+(https?:\/\/[^\s/]+(?::\d+)?)/i,
    /url:\s*(https?:\/\/[^\s,]+)/i
  ],
  expo: [
    /Web is waiting on\s+(https?:\/\/[^\s]+)/i,
    /Waiting on\s+(https?:\/\/[^\s]+)/i,
    /Metro waiting on\s+(\S+)/i
  ]
}

function patternsFor(flavor: DevServerFlavor): RegExp[] {
  if (flavor === 'auto') return [...PATTERNS.vite, ...PATTERNS.next, ...PATTERNS.expo]
  return PATTERNS[flavor]
}

function detectUrl(line: string, flavor: DevServerFlavor): string | null {
  for (const re of patternsFor(flavor)) {
    const m = re.exec(line)
    if (m?.[1]) return m[1].replace(/\/$/, '')
  }
  return null
}

export class DevServer extends EventEmitter {
  private child: ChildProcess | null = null
  private url: string | null = null
  private readyTimer: NodeJS.Timeout | null = null
  private stdoutBuf = ''
  private stderrBuf = ''

  constructor(private opts: DevServerOptions) {
    super()
  }

  start(): void {
    const command = this.opts.command ?? 'npm run dev'
    this.child = spawn(command, {
      cwd: this.opts.cwd,
      shell: true,
      detached: process.platform !== 'win32', // own process group on POSIX
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.child.stdout?.on('data', (b: Buffer) => this.onChunk(b, 'stdout'))
    this.child.stderr?.on('data', (b: Buffer) => this.onChunk(b, 'stderr'))

    this.child.on('exit', (code, signal) => {
      this.clearReadyTimer()
      this.emit('exit', { code, signal })
    })
    this.child.on('error', (err) => this.emit('error', err))

    const timeout = this.opts.readyTimeoutMs ?? 120_000
    this.readyTimer = setTimeout(() => {
      if (!this.url) {
        this.emit('error', new Error(`dev server URL not detected within ${timeout}ms`))
      }
    }, timeout)
  }

  private onChunk(buf: Buffer, stream: 'stdout' | 'stderr'): void {
    const key = stream === 'stdout' ? 'stdoutBuf' : 'stderrBuf'
    const acc = (this[key] as string) + buf.toString('utf8')
    const lines = acc.split(/\r?\n/)
    this[key] = lines.pop() ?? '' // keep trailing partial line
    for (const raw of lines) {
      const clean = stripVTControlCharacters(raw)
      this.emit('line', { stream, line: clean })
      if (!this.url) {
        const found = detectUrl(clean, this.opts.flavor ?? 'auto')
        if (found) {
          this.url = found
          this.clearReadyTimer()
          this.emit('ready', { url: this.url })
        }
      }
    }
  }

  /** Kill the entire child PROCESS TREE. Resolves once the kill is issued. */
  stop(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    return new Promise((resolve) => {
      this.clearReadyTimer()
      const child = this.child
      this.child = null
      if (!child || child.pid == null) return resolve()
      const pid = child.pid
      treeKill(pid, signal, (err) => {
        if (err && process.platform !== 'win32') {
          try {
            process.kill(-pid, 'SIGKILL') // NEGATIVE pid = process group (detached:true)
          } catch {
            /* already gone */
          }
        }
        resolve()
      })
    })
  }

  getUrl(): string | null {
    return this.url
  }

  private clearReadyTimer(): void {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer)
      this.readyTimer = null
    }
  }
}
