"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="relative">
                {toasts.map((toast, index) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        index={index}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
}

function ToastItem({ toast, index, onRemove }: { toast: Toast; index: number; onRemove: (id: string) => void }) {
    const [isShrinking, setIsShrinking] = useState(false);
    const [createdAt] = useState(() => Date.now());

    useEffect(() => {
        // 每个气泡独立的2秒生命周期，从创建时开始计时
        const elapsed = Date.now() - createdAt;
        const remaining = Math.max(0, 2000 - elapsed);
        
        // 如果已经过了2秒，使用 setTimeout 延迟设置状态
        if (remaining <= 0) {
            const shrinkTimer = setTimeout(() => {
                setIsShrinking(true);
            }, 0);
            const removeTimer = setTimeout(() => {
                onRemove(toast.id);
            }, 300); // 只等待动画时间
            
            return () => {
                clearTimeout(shrinkTimer);
                clearTimeout(removeTimer);
            };
        }
        
        // 2秒后开始缩小
        const shrinkTimer = setTimeout(() => {
            setIsShrinking(true);
        }, remaining);

        // 缩小动画完成后移除
        const removeTimer = setTimeout(() => {
            onRemove(toast.id);
        }, remaining + 300); // 剩余时间 + 300ms 动画时间

        return () => {
            clearTimeout(shrinkTimer);
            clearTimeout(removeTimer);
        };
    }, [toast.id, onRemove, createdAt]);

    const bgColor = toast.type === "success" 
        ? "bg-green-50 border-green-200" 
        : "bg-red-50 border-red-200";
    
    const textColor = toast.type === "success"
        ? "text-green-700"
        : "text-red-700";

    return (
        <div
            className={`
                absolute left-1/2 -translate-x-1/2
                px-4 py-3 rounded-lg border shadow-lg
                ${bgColor} ${textColor}
                text-sm font-medium
                pointer-events-auto
                transition-all duration-300 ease-in-out
                ${isShrinking ? "scale-0 opacity-0" : "scale-100 opacity-100"}
            `}
            style={{
                top: `${index * 50}px`,
            }}
        >
            {toast.message}
        </div>
    );
}

