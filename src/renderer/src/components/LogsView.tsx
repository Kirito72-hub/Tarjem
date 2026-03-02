import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  Search,
  Download,
  Zap,
  Film,
  Tag,
  Copy
} from 'lucide-react'
import {
  useLogStore,
  ProcessLog,
  LogStep,
  LogPhase,
  PHASE_META,
  ProcessLogMetadata,
  ProcessLogSyncInfo
} from '../store/logStore'

// ── Phase icon map ────────────────────────────────────────────────────────────

const PHASE_ICON: Record<LogPhase, React.ReactNode> = {
  TITLE: <Tag size={13} />,
  SEARCH: <Search size={13} />,
  DOWNLOAD: <Download size={13} />,
  SYNC: <Zap size={13} />,
  MERGE: <Film size={13} />
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/** Derive the worst step type in a group of steps (for phase status badge) */
function phaseStatus(steps: LogStep[]): LogStep['type'] {
  if (steps.some((s) => s.type === 'ERROR')) return 'ERROR'
  if (steps.some((s) => s.type === 'WARNING')) return 'WARNING'
  if (steps.some((s) => s.type === 'SUCCESS')) return 'SUCCESS'
  return 'INFO'
}

/** Duration string: "1.4s" between first and last step in a phase */
function phaseDuration(steps: LogStep[]): string | null {
  if (steps.length < 2) return null
  const ms = new Date(steps[steps.length - 1].timestamp).getTime()
    - new Date(steps[0].timestamp).getTime()
  return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : null
}

/**
 * Collapse consecutive steps with identical messages into a single entry.
 * The `count` field tracks how many duplicates were merged (1 = no duplicate).
 */
interface DedupedStep extends LogStep {
  count: number
}

function dedupeSteps(steps: LogStep[]): DedupedStep[] {
  const result: DedupedStep[] = []
  for (const step of steps) {
    const prev = result[result.length - 1]
    if (prev && prev.message === step.message && prev.type === step.type) {
      prev.count++
    } else {
      result.push({ ...step, count: 1 })
    }
  }
  return result
}

// ── Step icon ─────────────────────────────────────────────────────────────────

function StepIcon({ type }: { type: LogStep['type'] }) {
  switch (type) {
    case 'SUCCESS': return <CheckCircle className="text-emerald-400/80" size={13} />
    case 'ERROR': return <XCircle className="text-red-400/80" size={13} />
    case 'WARNING': return <AlertTriangle className="text-amber-400/80" size={13} />
    default: return <div className="w-3 h-3 rounded-full border border-gray-600 bg-gray-800/60" />
  }
}

// ── Phase status colours ──────────────────────────────────────────────────────

const PHASE_STATUS_STYLE: Record<LogStep['type'], string> = {
  SUCCESS: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  ERROR: 'text-red-400    bg-red-400/10    border-red-500/20',
  WARNING: 'text-amber-400  bg-amber-400/10  border-amber-500/20',
  INFO: 'text-blue-400   bg-blue-400/10   border-blue-500/20'
}

const PHASE_STATUS_DOT: Record<LogStep['type'], string> = {
  SUCCESS: 'bg-emerald-400',
  ERROR: 'bg-red-400',
  WARNING: 'bg-amber-400',
  INFO: 'bg-blue-400'
}

// ── Overall log status icon ───────────────────────────────────────────────────

function StatusIcon({ status }: { status: ProcessLog['status'] }) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle className="text-emerald-400" size={18} />
    case 'FAILED': return <XCircle className="text-red-400" size={18} />
    case 'WARNING': return <AlertTriangle className="text-amber-400" size={18} />
    case 'IN_PROGRESS': return <Clock className="text-blue-400 animate-pulse" size={18} />
    default: return <Info className="text-gray-500" size={18} />
  }
}

// ── PhaseRow — a single collapsible phase section ─────────────────────────────

interface PhaseRowProps {
  phase: LogPhase
  steps: LogStep[]
}

function PhaseRow({ phase, steps }: PhaseRowProps) {
  const [open, setOpen] = useState(false)
  const meta = PHASE_META[phase]
  const status = phaseStatus(steps)
  const duration = phaseDuration(steps)
  const lastMsg = steps[steps.length - 1]?.message ?? ''
  const deduped = dedupeSteps(steps)
  const uniqueCount = deduped.length
  const totalCount = steps.length

  return (
    <div className="rounded-lg border border-white/5 overflow-hidden">
      {/* Phase header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        {/* Expand chevron */}
        <span className="text-gray-600 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Phase icon + name */}
        <span className={`flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase shrink-0 ${PHASE_STATUS_STYLE[status]} px-2 py-1 rounded-md border`}>
          {PHASE_ICON[phase]}
          {meta.label}
        </span>

        {/* Last step summary (collapsed view) */}
        {!open && (
          <span className="flex-1 min-w-0 text-xs text-gray-500 truncate">{lastMsg}</span>
        )}

        <div className="shrink-0 flex items-center gap-2 ml-auto">
          {duration && (
            <span className="text-xs font-mono text-gray-600">{duration}</span>
          )}
          <span className="text-xs text-gray-600">
            {uniqueCount !== totalCount
              ? `${uniqueCount} unique / ${totalCount} total`
              : `${totalCount} step${totalCount !== 1 ? 's' : ''}`
            }
          </span>
          <span className={`w-2 h-2 rounded-full ${PHASE_STATUS_DOT[status]}`} />
        </div>
      </button>

      {/* Step list (expanded) */}
      {open && (
        <div className="border-t border-white/5 bg-[#0A0C12]/50 divide-y divide-white/[0.03]">
          {deduped.map((step) => (
            <div key={step.id} className="flex items-start gap-3 px-5 py-2.5 group hover:bg-white/[0.02] transition-colors">
              <div className="mt-0.5 shrink-0">
                <StepIcon type={step.type} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs leading-relaxed ${step.type === 'ERROR' ? 'text-red-400' :
                  step.type === 'WARNING' ? 'text-amber-300' :
                    step.type === 'SUCCESS' ? 'text-emerald-300' :
                      'text-gray-400'
                  }`}>
                  {step.message}
                </span>
                {/* Duplicate count badge */}
                {step.count > 1 && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    ×{step.count}
                  </span>
                )}
                {step.detail && (
                  <div className="mt-1 text-xs text-gray-500 font-mono bg-black/30 px-2 py-1.5 rounded border border-white/5 break-all">
                    {step.detail}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-gray-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(step.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MetadataCard ─────────────────────────────────────────────────────────────

function MetadataCard({ meta }: { meta: ProcessLogMetadata }) {
  const epLabel =
    meta.episode !== undefined
      ? `S${String(meta.season ?? 1).padStart(2, '0')}E${String(meta.episode).padStart(2, '0')}`
      : meta.type === 'movie' ? 'Movie' : null

  const parserColour: Record<string, string> = {
    anitomy: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    guessit: 'bg-sky-500/15    text-sky-300    border-sky-500/20',
    'path-context': 'bg-teal-500/15 text-teal-300   border-teal-500/20',
    'anime-name-tool': 'bg-pink-500/15 text-pink-300 border-pink-500/20'
  }
  const parserStyle = parserColour[meta.parserUsed ?? ''] ?? 'bg-gray-500/15 text-gray-300 border-gray-500/20'

  return (
    <div className="mb-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
      {/* Title row */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-sm font-semibold text-white">{meta.title ?? '—'}</span>
        {epLabel && (
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {epLabel}
          </span>
        )}
        {meta.year && (
          <span className="text-xs text-gray-500">{meta.year}</span>
        )}
        {meta.anilistVerified && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            ✓ AniList
          </span>
        )}
      </div>

      {/* Details row */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {meta.parserUsed && (
          <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${parserStyle}`}>
            {meta.parserUsed}
          </span>
        )}
        {meta.anilistId && (
          <span className="text-[11px] text-gray-500 font-mono">AniList·{meta.anilistId}</span>
        )}
        {meta.malId && (
          <span className="text-[11px] text-gray-500 font-mono">MAL·{meta.malId}</span>
        )}
        {meta.resolution && (
          <span className="text-[11px] text-gray-500">{meta.resolution}</span>
        )}
        {meta.releaseGroup && (
          <span className="text-[11px] text-gray-500">[{meta.releaseGroup}]</span>
        )}
        {meta.source && (
          <span className="text-[11px] text-gray-500">{meta.source}</span>
        )}
      </div>
    </div>
  )
}

// ── ProviderSummary (Step 4) ─────────────────────────────────────────────────

const PROVIDER_COLOURS: Record<string, string> = {
  SubDL: 'bg-blue-500/15  text-blue-300   border-blue-500/25',
  SubSource: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  OpenSubtitles: 'bg-amber-500/15  text-amber-300  border-amber-500/25',
  Unknown: 'bg-gray-500/15   text-gray-400   border-gray-500/25'
}

function ProviderSummary({ results }: { results: Record<string, number> }) {
  const entries = Object.entries(results)
  if (entries.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
      <span className="text-[11px] text-gray-600 uppercase tracking-wider">Providers</span>
      {entries.map(([name, count]) => (
        <span
          key={name}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${PROVIDER_COLOURS[name] ?? PROVIDER_COLOURS.Unknown}`}
        >
          <Search size={10} />
          {name}
          <span className="opacity-60">×{count}</span>
        </span>
      ))}
    </div>
  )
}

// ── SyncCard (Step 5) ───────────────────────────────────────────────────

function SyncCard({ info }: { info: ProcessLogSyncInfo }) {
  return (
    <div className={`mb-2 rounded-lg border px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 ${info.accepted
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-amber-500/20  bg-amber-500/5'
      }`}>
      {/* Status badge */}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${info.accepted
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
          : info.skipped
            ? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
        }`}>
        <Zap size={10} className="inline mr-1" />
        {info.accepted ? 'Synced' : info.skipped ? 'Skipped' : 'Rejected'}
      </span>

      {info.fpsMismatch !== undefined && (
        <span className="text-[11px] text-gray-400">
          FPS mismatch <span className="font-mono text-white">{info.fpsMismatch.toFixed(2)}%</span>
        </span>
      )}
      {info.fpsRatio !== undefined && (
        <span className="text-[11px] text-gray-400">
          ratio <span className="font-mono text-white">{info.fpsRatio.toFixed(6)}</span>
        </span>
      )}
      {info.shiftSeconds !== undefined && (
        <span className={`text-[11px] ${info.shiftSeconds > 30 ? 'text-red-400' : 'text-gray-400'}`}>
          max shift <span className="font-mono">{info.shiftSeconds}s</span>
          {info.shiftSeconds > 30 && <span className="ml-1 text-red-400">(too large)</span>}
        </span>
      )}
      {info.skipReason && !info.accepted && (
        <span className="text-[11px] text-gray-600 truncate max-w-xs" title={info.skipReason}>
          {info.skipReason.split('\n')[0]}
        </span>
      )}
    </div>
  )
}

// ── LogsView — main component ─────────────────────────────────────────────────

export const LogsView: React.FC = () => {
  const { logs, clearLogs } = useLogStore()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Copy all logs as formatted plain text to clipboard */
  const copyAllLogs = () => {
    const lines: string[] = []
    for (const log of logs) {
      lines.push(`=== ${log.filename} [${log.status}] @ ${new Date(log.timestamp).toISOString()} ===${''}`)
      for (const step of log.steps) {
        lines.push(`  [${step.phase}] [${step.type}] ${step.message}`)
        if (step.detail) lines.push(`    ${step.detail}`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F111A]">
      {/* Header */}
      <div className="px-8 py-6 flex items-end justify-between border-b border-white/5 bg-[#0F111A]/95 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Activity Logs</h2>
          <div className="text-sm text-gray-500">Track process history and debugging info</div>
        </div>
        {logs.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyAllLogs}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C212E] border border-white/5 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/20 transition-all text-sm font-medium"
            >
              <Copy size={15} />
              {copied ? 'Copied!' : 'Copy Log'}
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C212E] border border-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/20 transition-all text-sm font-medium"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Logs list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
            <FileText size={48} className="opacity-20" />
            <p>No activity logs yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map((log) => {
              const isExpanded = expandedIds.has(log.id)

              // Group steps by phase in order
              const phaseOrder: LogPhase[] = ['TITLE', 'SEARCH', 'DOWNLOAD', 'SYNC', 'MERGE']
              const byPhase = phaseOrder
                .map((phase) => ({
                  phase,
                  steps: log.steps.filter((s) => s.phase === phase)
                }))
                .filter((g) => g.steps.length > 0)

              return (
                <div
                  key={log.id}
                  className="bg-[#161B22] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all"
                >
                  {/* Log header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="text-gray-600 shrink-0">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    <div className="shrink-0">
                      <StatusIcon status={log.status} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 truncate" title={log.filename}>
                        {log.filename}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {log.steps.length > 0
                          ? log.steps[log.steps.length - 1].message
                          : 'Started…'}
                      </div>
                    </div>

                    {/* Phase pill summary */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {byPhase.map(({ phase, steps }) => {
                        const st = phaseStatus(steps)
                        return (
                          <span
                            key={phase}
                            title={PHASE_META[phase].label}
                            className={`w-2 h-2 rounded-full ${PHASE_STATUS_DOT[st]}`}
                          />
                        )
                      })}
                    </div>

                    <div className="text-xs font-mono text-gray-600 shrink-0">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>

                  {/* Phase pipeline (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-4 py-4 flex flex-col gap-2">
                      {/* Metadata card — shown when structured metadata is available */}
                      {log.metadata?.title && <MetadataCard meta={log.metadata} />}
                      {byPhase.map(({ phase, steps }) => (
                        <React.Fragment key={phase}>
                          {/* Provider badge row above SEARCH phase */}
                          {phase === 'SEARCH' && log.providerResults && (
                            <ProviderSummary results={log.providerResults} />
                          )}
                          {/* Alass sync card above SYNC phase */}
                          {phase === 'SYNC' && log.syncInfo && (
                            <SyncCard info={log.syncInfo} />
                          )}
                          <PhaseRow phase={phase} steps={steps} />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
