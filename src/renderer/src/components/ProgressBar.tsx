import React from 'react'
import { FileStatus } from '../../../types'

interface ProgressBarProps {
    progress: number
    status: FileStatus
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'HASHING':
                return 'bg-blue-500'
            case 'SEARCHING':
                return 'bg-purple-500'
            case 'DOWNLOADING':
                return 'bg-cyan-500'
            case 'MERGING':
                return 'bg-yellow-500'
            case 'COMPLETED':
                return 'bg-green-500'
            case 'ERROR':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className="w-full bg-dark-border rounded-full h-2 overflow-hidden">
            <div
                className={`h-full transition-all duration-300 ${getStatusColor()}`}
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}

