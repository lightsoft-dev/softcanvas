import { query } from '@anthropic-ai/claude-agent-sdk'

export type EditScope = { type: 'project' } | { type: 'screen'; route: string; filePath?: string }

export interface EditHandlers {
  onProgress: (msg: string) => void
}

export interface EditOutcome {
  ok: boolean
  summary: string
  changedFiles: string[]
  error?: string
}

interface LooseContentBlock {
  type: string
  text?: string
  name?: string
  input?: { file_path?: string } & Record<string, unknown>
}

function buildPrompt(userPrompt: string, scope: EditScope): string {
  if (scope.type === 'screen') {
    const where = scope.filePath ? `, implemented in \`${scope.filePath}\`` : ''
    return `You are editing the web application in the current working directory. Its dev server is running with hot-reload, so keep the app in a compiling state.

Focus on the screen at route "${scope.route}"${where}. Find the code that renders this screen and make the requested change. If shared components/styles must change, that is fine — but stay scoped to what the request needs.

User request:
${userPrompt}

When done, briefly summarize what you changed.`
  }
  return `You are editing the web application in the current working directory. Its dev server is running with hot-reload, so keep the app in a compiling state.

Make the requested change across the codebase as needed.

User request:
${userPrompt}

When done, briefly summarize what you changed.`
}

export async function runEdit(
  projectPath: string,
  userPrompt: string,
  scope: EditScope,
  handlers: EditHandlers,
  abortController?: AbortController
): Promise<EditOutcome> {
  const changed = new Set<string>()
  const q = query({
    prompt: buildPrompt(userPrompt, scope),
    options: {
      cwd: projectPath,
      // This is an explicit, user-initiated coding request on their own project,
      // running headlessly — auto-approve tool use (no prompt to hang on).
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 80,
      ...(abortController ? { abortController } : {})
    }
  })

  let summary = ''
  for await (const m of q) {
    if (m.type === 'assistant') {
      const content = (m.message as unknown as { content?: LooseContentBlock[] }).content ?? []
      for (const b of content) {
        if (b.type === 'text' && b.text) {
          handlers.onProgress(b.text.slice(0, 600))
        } else if (b.type === 'tool_use') {
          const fp = b.input?.file_path
          if ((b.name === 'Edit' || b.name === 'Write' || b.name === 'MultiEdit') && fp) {
            changed.add(fp)
            handlers.onProgress(`✏️ ${b.name} ${fp}`)
          } else {
            handlers.onProgress(`→ ${b.name ?? 'tool'}`)
          }
        }
      }
    } else if (m.type === 'result') {
      summary = m.subtype === 'success' ? m.result : `ended: ${m.subtype}`
    }
  }

  return { ok: true, summary, changedFiles: [...changed] }
}
