import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
}

interface ToastContextType {
    addToast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, type, title, message }])

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999] pointer-events-none">
                {toasts.map(toast => {
                    const bgColor = toast.type === 'success' ? 'border-l-green-500' : 
                                  toast.type === 'error' ? 'border-l-red-500' : 
                                  'border-l-blue-500'
                    
                    const iconColor = toast.type === 'success' ? 'text-green-500' : 
                                    toast.type === 'error' ? 'text-red-500' : 
                                    'text-blue-500'

                    return (
                        <div 
                            key={toast.id} 
                            className={`flex items-center gap-3 p-4 pr-5 rounded-lg bg-bgCard text-textPrimary shadow-2xl min-w-[300px] max-w-[400px] pointer-events-auto animate-in slide-in-from-right-full duration-300 border-l-4 ${bgColor} backdrop-blur-md border border-[var(--color-border)]`}
                        >
                            <div className="flex-shrink-0">
                                {toast.type === 'success' && <CheckCircle className={iconColor} size={20} />}
                                {toast.type === 'error' && <AlertCircle className={iconColor} size={20} />}
                                {toast.type === 'info' && <Info className={iconColor} size={20} />}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{toast.title}</div>
                                {toast.message && <div className="text-xs text-textMuted">{toast.message}</div>}
                            </div>
                            <button 
                                className="text-textMuted hover:text-textPrimary transition-colors p-1" 
                                onClick={() => removeToast(toast.id)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}