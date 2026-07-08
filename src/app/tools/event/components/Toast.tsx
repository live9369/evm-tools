"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error";

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose?: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 300); // 等待动画完成
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    const bgColor = type === "success" 
        ? "bg-green-50 border-green-200" 
        : "bg-red-50 border-red-200";
    
    const textColor = type === "success"
        ? "text-green-700"
        : "text-red-700";

    return (
        <div className={`
            fixed top-4 right-4 z-50
            px-4 py-3 rounded-lg border shadow-lg
            ${bgColor} ${textColor}
            text-sm font-medium
            animate-in slide-in-from-top-5 fade-in
            transition-all duration-300
        `}>
            {message}
        </div>
    );
}

