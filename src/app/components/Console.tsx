"use client";

import { useState, useEffect } from "react";
import { Console as ConsoleFeed } from "console-feed";

export type LogLevel = "log" | "info" | "warn" | "error";

export interface LogEntry {
    id: string;
    method: LogLevel;
    data: unknown[];
    timestamp: number;
}

interface ConsoleProps {
    logs: LogEntry[];
    onClear: () => void;
    maxHeight?: number;
}

export function Console({ logs, onClear, maxHeight = 400 }: ConsoleProps) {
    // 将我们的日志格式转换为 console-feed 的格式
    const consoleFeedLogs = logs.map(log => ({
        method: log.method,
        data: log.data,
        id: log.id,
    }));

    // 检测当前主题（使用 useEffect 确保在客户端执行）
    const [isDark, setIsDark] = useState(false);
    
    useEffect(() => {
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };
        
        checkTheme();
        
        // 监听主题变化
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        
        return () => observer.disconnect();
    }, []);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--fg)]">
                    控制台 ({logs.length})
                </div>
                <button
                    onClick={onClear}
                    className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
                >
                    清空
                </button>
            </div>
            <div 
                className="bg-[var(--card)] border-[var(--border)] border rounded overflow-hidden"
                style={{ maxHeight: `${maxHeight}px` }}
            >
                {logs.length === 0 ? (
                    <div className="text-[var(--muted)] text-center py-4 text-sm">
                        暂无日志
                    </div>
                ) : (
                    <div style={{ height: `${maxHeight}px`, overflow: "auto" }}>
                        <ConsoleFeed 
                            logs={consoleFeedLogs}
                            variant={isDark ? "dark" : "light"}
                            styles={{
                                BASE_BACKGROUND_COLOR: "var(--card)",
                                BASE_COLOR: "var(--fg)",
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

