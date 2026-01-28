import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { ToastMessage, ToastType, useToastStore } from '../store/toastStore'

const icons = {
  success: <CheckCircle size={20} className="text-green-400" />,
  error: <AlertCircle size={20} className="text-red-400" />,
  info: <Info size={20} className="text-blue-400" />,
  warning: <AlertTriangle size={20} className="text-yellow-400" />
}

const borderConfig = {
  success: 'border-green-500/20 bg-green-500/10',
  error: 'border-red-500/20 bg-red-500/10',
  info: 'border-blue-500/20 bg-blue-500/10',
  warning: 'border-yellow-500/20 bg-yellow-500/10'
}

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({
  toast,
  onRemove
}) => {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md shadow-lg animate-in slide-in-from-right-full duration-300 w-80 pointer-events-auto ${borderConfig[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
