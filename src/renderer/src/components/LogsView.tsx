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
    FileText
} from 'lucide-react'
import { useLogStore, ProcessLog, LogStep } from '../store/logStore'

export const LogsView: React.FC = () => {
    const { logs, clearLogs } = useLogStore()
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const getStatusIcon = (status: ProcessLog['status']) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="text-green-500" size={18} />
            case 'FAILED': return <XCircle className="text-red-500" size={18} />
            case 'WARNING': return <AlertTriangle className="text-amber-500" size={18} />
            case 'IN_PROGRESS': return <Clock className="text-blue-500 animate-pulse" size={18} />
            default: return <Info className="text-gray-500" size={18} />
        }
    }

    const getStepIcon = (type: LogStep['type']) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="text-green-500/80" size={14} />
            case 'ERROR': return <XCircle className="text-red-500/80" size={14} />
            case 'WARNING': return <AlertTriangle className="text-amber-500/80" size={14} />
            default: return <div className="w-3.5 h-3.5 rounded-full bg-gray-700/50 border border-gray-600" />
        }
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
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C212E] border border-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/20 transition-all text-sm font-medium"
                    >
                        <Trash2 size={16} />
                        Clear Logs
                    </button>
                )}
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                        <FileText size={48} className="opacity-20" />
                        <p>No activity logs yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="bg-[#161B22] border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10"
                            >
                                {/* Log Header / Summary */}
                                <div
                                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02]"
                                    onClick={() => toggleExpand(log.id)}
                                >
                                    <div className="text-gray-500">
                                        {expandedIds.has(log.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </div>

                                    <div className="shrink-0">
                                        {getStatusIcon(log.status)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-200 truncate" title={log.filename}>
                                            {log.filename}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {log.steps.length > 0 ? log.steps[log.steps.length - 1].message : 'Started...'}
                                        </div>
                                    </div>

                                    <div className="text-xs font-mono text-gray-600">
                                        {formatTime(log.timestamp)}
                                    </div>
                                </div>

                                {/* Expanded Steps */}
                                {expandedIds.has(log.id) && (
                                    <div className="border-t border-white/5 bg-[#0F111A]/30 p-4 pl-12 flex flex-col gap-2">
                                        {log.steps.map((step) => (
                                            <div key={step.id} className="flex gap-3 text-sm group">
                                                <div className="mt-0.5 shrink-0 w-4 flex justify-center">
                                                    {getStepIcon(step.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-gray-300 ${step.type === 'ERROR' ? 'text-red-400' : ''}`}>
                                                        {step.message}
                                                    </div>
                                                    {step.detail && (
                                                        <div className="text-xs text-gray-500 font-mono mt-1 break-all bg-black/20 p-1.5 rounded border border-white/5">
                                                            {step.detail}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-600 font-mono shrink-0 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {formatTime(step.timestamp)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
