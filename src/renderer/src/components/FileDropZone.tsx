import React from 'react'
import { Upload, FolderOpen } from 'lucide-react'

interface FileDropZoneProps {
    onFilesAdded: (files: File[]) => void
    accept?: string
    multiple?: boolean
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
    onFilesAdded,
    accept = '.mp4,.mkv,.avi,.mov,.srt,.ass,.ssa',
    multiple = true
}) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            onFilesAdded(files)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            onFilesAdded(files)
        }
    }

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dark-border hover:border-accent-primary/50 hover:bg-dark-hover'
                }`}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="flex flex-col items-center gap-4">
                {isDragging ? (
                    <Upload className="w-12 h-12 text-accent-primary animate-bounce" />
                ) : (
                    <FolderOpen className="w-12 h-12 text-gray-500" />
                )}

                <div>
                    <p className="text-white font-medium mb-1">
                        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-sm text-gray-500">
                        or click to browse • Supports video and subtitle files
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-2 py-1 bg-dark-surface rounded text-xs text-gray-400">MP4</span>
                    <span className="px-2 py-1 bg-dark-surface rounded text-xs text-gray-400">MKV</span>
                    <span className="px-2 py-1 bg-dark-surface rounded text-xs text-gray-400">AVI</span>
                    <span className="px-2 py-1 bg-dark-surface rounded text-xs text-gray-400">SRT</span>
                    <span className="px-2 py-1 bg-dark-surface rounded text-xs text-gray-400">ASS</span>
                </div>
            </div>
        </div>
    )
}

