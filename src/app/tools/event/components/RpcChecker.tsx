"use client";

import { useState, useEffect, useRef } from "react";
import { JsonRpcProvider } from "ethers";
import { ToastContainer } from "@/app/components/ToastContainer";

type ChainInfo = {
    chainId: number;
    name: string;
    blockNumber: number;
    supportsNewFilter: boolean | null; // null 表示未检测
} | null;

import type { Toast } from "@/app/components/ToastContainer";

interface RpcCheckerProps {
    onRpcUrlChange?: (url: string) => void;
    defaultRpcUrl?: string;
}

export function RpcChecker({ onRpcUrlChange, defaultRpcUrl = "" }: RpcCheckerProps = {}) {
    const [rpcUrl, setRpcUrl] = useState(defaultRpcUrl);
    const [isChecking, setIsChecking] = useState(false);
    const [chainInfo, setChainInfo] = useState<ChainInfo>(null);
    const [hasFetchedChainInfo, setHasFetchedChainInfo] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    function addToast(message: string, type: "success" | "error") {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setToasts(prev => [{ id, message, type }, ...prev]);
    }

    function removeToast(id: string) {
        setToasts(prev => prev.filter(t => t.id !== id));
    }

    async function checkRpc() {
        if (!rpcUrl || !rpcUrl.startsWith("http")) {
            addToast("请输入有效的 RPC URL（以 http:// 或 https:// 开头）", "error");
            return;
        }

        setIsChecking(true);
        const startTime = Date.now();

        try {
            const provider = new JsonRpcProvider(rpcUrl);
            
            // 只在第一次获取链信息
            if (!hasFetchedChainInfo) {
                const network = await provider.getNetwork();
                const blockNumber = await provider.getBlockNumber();
                
                // 检测 eth_newFilter 支持
                let supportsNewFilter: boolean | null = null;
                try {
                    // 尝试创建一个简单的过滤器来检测支持
                    const filterId = await provider.send("eth_newFilter", [{
                        fromBlock: "latest",
                        toBlock: "latest"
                    }]);
                    supportsNewFilter = true;
                    // 清理创建的过滤器
                    if (filterId) {
                        try {
                            await provider.send("eth_uninstallFilter", [filterId]);
                        } catch {
                            // 忽略清理错误
                        }
                    }
                } catch (filterErr: unknown) {
                    const filterErrorMsg = filterErr instanceof Error ? filterErr.message : String(filterErr);
                    // 如果错误信息包含 "not supported" 或 "method not found"，则不支持
                    if (filterErrorMsg.includes("not supported") || 
                        (filterErrorMsg.includes("method") && filterErrorMsg.includes("not found")) ||
                        filterErrorMsg.includes("-32603")) {
                        supportsNewFilter = false;
                    } else {
                        // 其他错误可能是网络问题，暂时标记为未知
                        supportsNewFilter = null;
                    }
                }
                
                // 保存链信息
                setChainInfo({
                    chainId: Number(network.chainId),
                    name: network.name,
                    blockNumber: blockNumber,
                    supportsNewFilter: supportsNewFilter
                });
                setHasFetchedChainInfo(true);
            }
            
            // 每次检测延迟（只请求区块号来测量延迟）
            await provider.getBlockNumber();
            const latencyMs = Date.now() - startTime;
            
            // 显示延迟气泡
            addToast(`${latencyMs}ms`, "success");
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addToast(`RPC 检测失败：${errorMsg}`, "error");
            // 如果获取链信息失败，重置状态
            if (!hasFetchedChainInfo) {
                setChainInfo(null);
            }
        } finally {
            setIsChecking(false);
        }
    }

    // 当 RPC URL 改变时，重置链信息获取状态
    function handleRpcUrlChange(newUrl: string) {
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl !== rpcUrl) {
            setHasFetchedChainInfo(false);
            setChainInfo(null);
        }
        setRpcUrl(trimmedUrl);
        onRpcUrlChange?.(trimmedUrl);
    }

    // 仅在父组件传入的 defaultRpcUrl 变化时同步（不要把本地 rpcUrl 放进依赖，否则会每次输入都被默认值覆盖）
    const defaultRpcUrlRef = useRef(defaultRpcUrl);
    useEffect(() => {
        if (defaultRpcUrl !== defaultRpcUrlRef.current) {
            defaultRpcUrlRef.current = defaultRpcUrl;
            if (defaultRpcUrl) {
                setRpcUrl(defaultRpcUrl);
                onRpcUrlChange?.(defaultRpcUrl);
                setHasFetchedChainInfo(false);
                setChainInfo(null);
            }
        }
    }, [defaultRpcUrl, onRpcUrlChange]);

    return (
        <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            
            <div className="p-4 bg-[var(--card)] border-[var(--border)] border rounded space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={rpcUrl}
                            onChange={(e) => handleRpcUrlChange(e.target.value)}
                            placeholder="https://eth.llamarpc.com"
                            className="w-full px-3 py-2 border-[var(--border)] border rounded bg-[var(--card)] text-[var(--fg)] text-sm"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={checkRpc}
                            disabled={isChecking || !rpcUrl}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isChecking ? "检测中..." : "检测 RPC"}
                        </button>
                    </div>
                </div>

                {/* 显示链信息 */}
                {chainInfo && (
                    <div className="pt-3 border-t border-[var(--border)]">
                        <div className="text-sm font-semibold text-[var(--fg)] mb-2">链信息:</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex gap-4">
                                <span className="text-[var(--muted)] w-24">链 ID:</span>
                                <span className="text-[var(--fg)] font-mono">{chainInfo.chainId}</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-[var(--muted)] w-24">网络:</span>
                                <span className="text-[var(--fg)]">{chainInfo.name}</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-[var(--muted)] w-24">最新区块:</span>
                                <span className="text-[var(--fg)] font-mono">{chainInfo.blockNumber}</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-[var(--muted)] w-24">事件过滤器:</span>
                                <span className="text-[var(--fg)]">
                                    {chainInfo.supportsNewFilter === null ? (
                                        <span className="text-[var(--muted)]">未检测</span>
                                    ) : chainInfo.supportsNewFilter ? (
                                        <span className="text-green-600">支持</span>
                                    ) : (
                                        <span className="text-red-600">不支持</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

