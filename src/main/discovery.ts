import { query, type PermissionResult } from '@anthropic-ai/claude-agent-sdk'

export interface DiscoveredScreen {
  route: string
  title: string
  filePath?: string
}

// Strictly read-only tool set — discovery must never modify the target project.
const READ_ONLY = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead'])

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    screens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          route: { type: 'string', description: 'URL path, e.g. "/", "/about", "/users/:id"' },
          title: { type: 'string', description: 'short human label for the screen' },
          filePath: { type: 'string', description: 'relative source file implementing it' }
        },
        required: ['route', 'title']
      }
    }
  },
  required: ['screens']
}

const PROMPT = `You are mapping ALL navigable screens of the web application in the current working directory.

Steps:
1. Detect how routing works: Next.js (app/ or pages/), React Router, Vue Router, Expo Router, SvelteKit, or a custom pathname switch.
2. Enumerate EVERY distinct navigable screen a user can reach, expressed as a URL path (e.g. "/", "/about", "/dashboard", "/users/:id").
   - Include the index/home route "/".
   - For dynamic segments keep the ":param" form (e.g. "/users/:id") unless an obvious concrete example exists.
   - Do NOT include API routes, layouts, error/loading boundaries, or non-page files.
3. For each screen give a short human "title" and the relative "filePath" that implements it.

Be thorough but precise — only real navigable screens. Return the result via the structured output.`

export interface DiscoverHandlers {
  onProgress: (msg: string) => void
}

interface LooseContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
}

function extractScreens(value: unknown): DiscoveredScreen[] {
  const obj =
    value && typeof value === 'object' && 'screens' in (value as Record<string, unknown>)
      ? (value as { screens?: unknown }).screens
      : value
  if (!Array.isArray(obj)) return []
  const seen = new Set<string>()
  const out: DiscoveredScreen[] = []
  for (const item of obj) {
    if (!item || typeof item !== 'object') continue
    const route = String((item as Record<string, unknown>).route ?? '').trim()
    if (!route || seen.has(route)) continue
    seen.add(route)
    out.push({
      route: route.startsWith('/') ? route : `/${route}`,
      title: String((item as Record<string, unknown>).title ?? route),
      filePath: (item as Record<string, unknown>).filePath
        ? String((item as Record<string, unknown>).filePath)
        : undefined
    })
  }
  return out
}

/** Best-effort: pull a JSON object/array out of free-form result text. */
function tryParseText(text: string): unknown {
  if (!text) return null
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : text
  const start = candidate.search(/[[{]/)
  if (start === -1) return null
  for (let end = candidate.length; end > start; end--) {
    const slice = candidate.slice(start, end)
    try {
      return JSON.parse(slice)
    } catch {
      /* keep shrinking */
    }
  }
  return null
}

export async function discoverScreens(
  projectPath: string,
  handlers: DiscoverHandlers,
  abortController?: AbortController
): Promise<DiscoveredScreen[]> {
  const q = query({
    prompt: PROMPT,
    options: {
      cwd: projectPath,
      // Don't inherit the user's local/project settings — otherwise their
      // pre-approved Bash rules would bypass our read-only canUseTool gate.
      settingSources: [],
      allowedTools: ['Read', 'Grep', 'Glob', 'LS'],
      // Hard-remove any tool that could mutate the target project or shell out.
      disallowedTools: ['Bash', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'WebFetch'],
      canUseTool: async (toolName, input): Promise<PermissionResult> =>
        READ_ONLY.has(toolName)
          ? { behavior: 'allow', updatedInput: input }
          : { behavior: 'deny', message: 'softcanvas screen discovery is read-only' },
      maxTurns: 40,
      outputFormat: { type: 'json_schema', schema: SCHEMA },
      ...(abortController ? { abortController } : {})
    }
  })

  let structured: unknown = null
  let lastText = ''

  for await (const msg of q) {
    if (msg.type === 'assistant') {
      const content = (msg.message as unknown as { content?: LooseContentBlock[] }).content ?? []
      for (const b of content) {
        if (b.type === 'text' && b.text) {
          lastText = b.text
          handlers.onProgress(b.text.slice(0, 400))
        } else if (b.type === 'tool_use') {
          handlers.onProgress(`→ ${b.name ?? 'tool'} ${JSON.stringify(b.input ?? {}).slice(0, 80)}`)
        }
      }
    } else if (msg.type === 'result') {
      if (msg.subtype === 'success') {
        structured = msg.structured_output ?? tryParseText(msg.result) ?? tryParseText(lastText)
      } else {
        handlers.onProgress(`discovery ended: ${msg.subtype}`)
        structured = tryParseText(lastText)
      }
    }
  }

  return extractScreens(structured)
}
