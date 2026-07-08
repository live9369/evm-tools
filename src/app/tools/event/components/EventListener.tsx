"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Interface, Contract, JsonRpcProvider, EventFragment } from "ethers";
import { ToastContainer, type Toast } from "@/app/components/ToastContainer";
import { EventCard, EventCardData } from "@/app/components/EventCard";
import { CodeEditor } from "@/app/components/CodeEditor";
import { Console, type LogEntry } from "@/app/components/Console";
import { createBaseHooksAPI } from "@/app/hooks/createBaseHooksAPI";
import { createEventHooksAPI } from "../hooks/createEventHooksAPI";
import { eventTemplates } from "@/app/templates/event";


interface EventListenerProps {
    rpcUrl: string;
    defaultAbi?: string;
    defaultAddress?: string;
}

export function EventListener({ rpcUrl, defaultAbi = "", defaultAddress = "" }: EventListenerProps) {
    const [abi, setAbi] = useState(defaultAbi);
    const [address, setAddress] = useState(defaultAddress);
    const [iface, setIface] = useState<Interface | null>(null);
    const [events, setEvents] = useState<string[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>("");
    const [isListening, setIsListening] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [eventCards, setEventCards] = useState<EventCardData[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filterCode, setFilterCode] = useState("");
    const [isFilterEnabled, setIsFilterEnabled] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; result: unknown; error?: string } | undefined>();
    const contractRef = useRef<Contract | null>(null);
    const listenerRef = useRef<(() => void) | null>(null);
    const prevRpcUrlRef = useRef<string>("");

    const addToast = useCallback((message: string, type: "success" | "error") => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setToasts(prev => [{ id, message, type }, ...prev]);
    }, []);

    function removeToast(id: string) {
        setToasts(prev => prev.filter(t => t.id !== id));
    }

    function removeEventCard(id: string) {
        setEventCards(prev => prev.filter(card => card.id !== id));
    }

    function clearAllEventCards() {
        setEventCards([]);
    }

    function clearLogs() {
        setLogs([]);
    }

    // 解析事件参数为对象
    function parseEventArgs(decodedArgs: Array<{ name: string; type: string; value: string }>): Record<string, unknown> {
        const argsObj: Record<string, unknown> = {};
        decodedArgs.forEach((arg) => {
            // 尝试解析值（处理数字、布尔值等）
            let parsedValue: unknown = arg.value;
            try {
                // 尝试解析为数字（BigInt）
                if (arg.type.startsWith("uint") || arg.type.startsWith("int")) {
                    parsedValue = BigInt(arg.value);
                } else if (arg.type === "bool") {
                    parsedValue = arg.value === "true" || arg.value === "1";
                } else if (arg.type === "address") {
                    parsedValue = arg.value;
                } else if (arg.type.startsWith("bytes")) {
                    parsedValue = arg.value;
                } else if (arg.type === "string") {
                    parsedValue = arg.value;
                } else if (arg.value.startsWith("[") && arg.value.endsWith("]")) {
                    // 数组类型
                    try {
                        parsedValue = JSON.parse(arg.value);
                    } catch {
                        parsedValue = arg.value;
                    }
                }
            } catch {
                // 保持原值
            }
            argsObj[arg.name || `param${Object.keys(argsObj).length}`] = parsedValue;
        });
        return argsObj;
    }

    // 执行 Hook 代码的函数
    const executeHookCode = useCallback(
        async (
            decodedArgs: Array<{ name: string; type: string; value: string }>,
            eventName: string,
            eventObj?: { blockNumber?: number; transactionHash?: string },
            provider?: JsonRpcProvider
        ) => {
            if (!filterCode.trim() || !isFilterEnabled) {
                return; // 如果代码为空或未启用，不执行
            }

            try {
                // 解析事件参数
                const argsObj = parseEventArgs(decodedArgs);

                // 创建基础 Hooks API（通用部分）
                const baseAPI = createBaseHooksAPI(provider || null, (log: LogEntry) => {
                    setLogs(prev => [...prev, log]);
                });

                // 扩展为 Event 特定的 Hooks API
                const hooksAPI = createEventHooksAPI(
                    baseAPI,
                    argsObj,
                    eventName,
                    decodedArgs,
                    eventObj,
                    (card: EventCardData) => {
                        setEventCards(prev => [...prev, card]);
                    }
                );

                // 注入 Hooks API 到执行环境，包装为异步函数以支持 await
                const hookFunction = new Function(
                    "hooks",
                    "eventName",
                    "eventObj",
                    `
                    return (async () => {
                        // 解构常用 API，方便使用
                        const { eventArgs, provider, ethers, addEventCard, log, info, warn, error } = hooks;
                        
                        ${filterCode}
                    })();
                `
                );
                
                await hookFunction(hooksAPI, eventName, eventObj);
            } catch (err: unknown) {
                console.error("Hook 代码执行错误:", err);
                addToast(`Hook 执行失败：${err instanceof Error ? err.message : String(err)}`, "error");
            }
        },
        [filterCode, isFilterEnabled, addToast]
    );

    // 测试 Hook 代码
    const handleTestFilter = useCallback(async () => {
        if (!iface || !selectedEvent) {
            setTestResult({
                success: false,
                result: false,
                error: "请先选择事件"
            });
            return;
        }

        try {
            // 获取事件片段
            const eventNameMatch = selectedEvent.match(/^event\s+(\w+)/);
            if (!eventNameMatch) {
                setTestResult({
                    success: false,
                    result: false,
                    error: "无法解析事件名称"
                });
                return;
            }
            const eventName = eventNameMatch[1];
            const eventFragment = iface.getEvent(eventName);
            
            if (!eventFragment) {
                setTestResult({
                    success: false,
                    result: false,
                    error: "无法找到事件片段"
                });
                return;
            }

            // 生成示例 decodedArgs（模拟真实事件参数格式）
            const exampleDecodedArgs: Array<{ name: string; type: string; value: string }> = [];
            eventFragment.inputs.forEach((input, idx) => {
                let exampleValue: string;
                if (input.type.startsWith("uint") || input.type.startsWith("int")) {
                    exampleValue = "1000000";
                } else if (input.type === "address") {
                    exampleValue = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
                } else if (input.type === "bool") {
                    exampleValue = "true";
                } else if (input.type === "string") {
                    exampleValue = "example";
                } else if (input.type.startsWith("bytes")) {
                    exampleValue = "0x1234";
                } else if (input.type.includes("[]")) {
                    exampleValue = "[1000000, 2000000]";
                } else {
                    exampleValue = "example";
                }
                exampleDecodedArgs.push({
                    name: input.name || `param${idx}`,
                    type: input.type,
                    value: exampleValue
                });
            });

            // 执行 Hook 代码（使用测试模式）
            if (!filterCode.trim()) {
                setTestResult({
                    success: true,
                    result: "代码为空，将使用默认行为（自动添加卡片）",
                    error: undefined
                });
                return;
            }

            // 创建测试用的 Hooks API（不实际添加卡片和日志，只记录调用）
            let hookCalled = false;
            let logCalled = false;
            
            const argsObj = parseEventArgs(exampleDecodedArgs);
            const exampleEventObj = { blockNumber: 12345, transactionHash: "0xabcdef123456" };
            
            // 创建测试用的基础 API
            const testBaseAPI = createBaseHooksAPI(null, () => {
                logCalled = true;
            });
            
            // 扩展为 Event 特定的测试 API
            const testHooksAPI = createEventHooksAPI(
                testBaseAPI,
                argsObj,
                eventName,
                exampleDecodedArgs,
                exampleEventObj,
                () => {
                    hookCalled = true;
                }
            );

            const hookFunction = new Function(
                "hooks",
                "eventName",
                "eventObj",
                `
                return (async () => {
                    const { eventArgs, provider, ethers, addEventCard, log, info, warn, error } = hooks;
                    ${filterCode}
                })();
            `
            );
            
            try {
                await hookFunction(testHooksAPI, eventName, exampleEventObj);
                
                const results: string[] = [];
                if (hookCalled) results.push("addEventCard 被调用");
                if (logCalled) results.push("日志方法被调用");
                
                setTestResult({
                    success: true,
                    result: results.length > 0 
                        ? `Hook 执行成功（${results.join("，")}）` 
                        : "Hook 执行成功（但未调用任何 API）",
                    error: undefined
                });
            } catch (err: unknown) {
                setTestResult({
                    success: false,
                    result: false,
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        } catch (err: unknown) {
            setTestResult({
                success: false,
                result: false,
                error: err instanceof Error ? err.message : String(err)
            });
        }
    }, [filterCode, iface, selectedEvent]);

    // 当有默认 ABI 时，自动解析
    useEffect(() => {
        if (defaultAbi && defaultAbi.trim() && !iface && abi === defaultAbi) {
            // 只有在使用默认值且尚未解析时才自动解析
            try {
                const parsed = JSON.parse(defaultAbi);
                const interfaceInstance = new Interface(parsed);
                
                const eventFragments = interfaceInstance.fragments
                    .filter(f => f.type === "event")
                    .map(f => {
                        const eventFragment = f as EventFragment;
                        return {
                            name: eventFragment.name,
                            signature: eventFragment.format("full")
                        };
                    });

                // 使用 setTimeout 避免在 effect 中直接调用 setState
                setTimeout(() => {
                    setIface(interfaceInstance);
                    setEvents(eventFragments.map(e => e.signature));
                    setSelectedEvent("");
                }, 0);
            } catch {
                // 如果解析失败，静默失败，让用户手动解析
            }
        }
    }, [defaultAbi, iface, abi]);

    // 解析 ABI
    function handleLoadABI() {
        if (!abi.trim()) {
            addToast("请输入 ABI", "error");
            return;
        }

        try {
            const parsed = JSON.parse(abi);
            const interfaceInstance = new Interface(parsed);
            
            // 提取所有事件（保存名称和完整签名）
            const eventFragments = interfaceInstance.fragments
                .filter(f => f.type === "event")
                .map(f => {
                    const eventFragment = f as EventFragment;
                    return {
                        name: eventFragment.name,
                        signature: eventFragment.format("full")
                    };
                });

            setIface(interfaceInstance);
            setEvents(eventFragments.map(e => e.signature));
            setSelectedEvent("");
            addToast(`ABI 解析成功，找到 ${eventFragments.length} 个事件`, "success");
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addToast(`ABI 解析失败：${errorMsg}`, "error");
            setIface(null);
            setEvents([]);
        }
    }

    // 开始/停止监听
    function toggleListening() {
        if (isListening) {
            // 停止监听
            if (listenerRef.current) {
                listenerRef.current();
                listenerRef.current = null;
            }
            if (contractRef.current) {
                contractRef.current = null;
            }
            setIsListening(false);
            addToast("已停止监听", "success");
        } else {
            // 开始监听
            if (!rpcUrl || !rpcUrl.startsWith("http")) {
                addToast("请先配置有效的 RPC URL", "error");
                return;
            }

            if (!iface) {
                addToast("请先解析 ABI", "error");
                return;
            }

            if (!selectedEvent) {
                addToast("请选择要监听的事件", "error");
                return;
            }

            if (!address || !address.startsWith("0x")) {
                addToast("请输入有效的合约地址（以 0x 开头）", "error");
                return;
            }

            try {
                const provider = new JsonRpcProvider(rpcUrl);
                const contract = new Contract(address, iface, provider);
                
                // 保存 provider 引用以便在 hook 中使用
                const providerRef = provider;

                // 从完整签名中提取事件名称
                // selectedEvent 格式类似 "event Transfer(address indexed from, address indexed to, uint256 value)"
                const eventNameMatch = selectedEvent.match(/^event\s+(\w+)/);
                if (!eventNameMatch) {
                    addToast("无法解析事件名称", "error");
                    return;
                }
                const eventName = eventNameMatch[1];

                // 获取事件片段（用于解析参数）
                const eventFragment = iface.getEvent(eventName);
                if (!eventFragment) {
                    addToast("无法找到事件片段", "error");
                    return;
                }

                // 监听事件（使用事件名称字符串）
                const listener = (...args: unknown[]) => {
                    try {
                        // 在 ethers v6 中，事件监听器的参数是：...eventArgs, eventObject
                        // 最后一个参数是事件对象，前面的都是解码后的事件参数
                        const eventArgs = args.slice(0, -1);
                        const eventObj = args[args.length - 1] as { blockNumber?: number; transactionHash?: string };

                        // 解析事件参数
                        const decodedArgs: Array<{ name: string; type: string; value: string }> = [];
                        eventFragment.inputs.forEach((input, idx) => {
                            const value = eventArgs[idx];
                            let displayValue = String(value);
                            
                            // 如果是数组，格式化显示
                            if (Array.isArray(value)) {
                                displayValue = `[${value.map(v => String(v)).join(", ")}]`;
                            } else if (typeof value === "object" && value !== null) {
                                // 处理对象类型（如 tuple）
                                displayValue = JSON.stringify(value);
                            }
                            
                            decodedArgs.push({
                                name: input.name || `param${idx}`,
                                type: input.type,
                                value: displayValue
                            });
                        });

                        // 执行 Hook 代码（如果启用）
                        if (isFilterEnabled && filterCode.trim()) {
                            executeHookCode(decodedArgs, eventName, eventObj, providerRef).catch(err => {
                                console.error("Hook 执行错误:", err);
                            });
                        } else {
                            // 默认行为：自动添加卡片
                            const eventId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                            const eventCard: EventCardData = {
                                id: eventId,
                                eventName: eventName,
                                args: decodedArgs,
                                blockNumber: eventObj?.blockNumber,
                                transactionHash: eventObj?.transactionHash
                            };
                            setEventCards(prev => [...prev, eventCard]);
                        }
                    } catch (err: unknown) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        addToast(`解析事件失败：${errorMsg}`, "error");
                    }
                };

                // 使用事件名称字符串监听事件
                contract.on(eventName, listener);

                // 保存清理函数
                listenerRef.current = () => {
                    contract.off(eventName, listener);
                };

                contractRef.current = contract;
                setIsListening(true);
                addToast(`开始监听事件: ${selectedEvent}`, "success");
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                addToast(`监听失败：${errorMsg}`, "error");
            }
        }
    }

    // RPC URL 改变时，如果正在监听则停止
    useEffect(() => {
        if (prevRpcUrlRef.current && prevRpcUrlRef.current !== rpcUrl && listenerRef.current) {
            listenerRef.current();
            listenerRef.current = null;
            contractRef.current = null;
            // 使用 setTimeout 避免在 effect 中直接调用 setState
            setTimeout(() => {
                setIsListening(false);
                if (rpcUrl) {
                    addToast("RPC URL 已更改，已停止监听", "error");
                }
            }, 0);
        }
        prevRpcUrlRef.current = rpcUrl;
    }, [rpcUrl, addToast]);

    // 组件卸载时清理监听器
    useEffect(() => {
        return () => {
            if (listenerRef.current) {
                listenerRef.current();
            }
        };
    }, []);

    return (
        <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            
            <div className="space-y-6">
                {/* ABI 输入 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium block">ABI:</label>
                    <textarea
                        value={abi}
                        onChange={(e) => setAbi(e.target.value)}
                        placeholder='[{"type":"event","name":"Transfer","inputs":[...]}]'
                        className="w-full px-3 py-2 border-[var(--border)] border rounded bg-[var(--card)] text-[var(--fg)] text-sm font-mono min-h-[120px]"
                    />
                    <button
                        onClick={handleLoadABI}
                        disabled={!abi.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        解析 ABI
                    </button>
                </div>

                {/* 合约地址输入 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium block">合约地址:</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value.trim())}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border-[var(--border)] border rounded bg-[var(--card)] text-[var(--fg)] text-sm font-mono"
                        disabled={isListening}
                    />
                </div>

                {/* 事件选择 */}
                {events.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium block">选择事件:</label>
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="w-full px-3 py-2 border-[var(--border)] border rounded bg-[var(--card)] text-[var(--fg)] text-sm"
                            disabled={isListening}
                        >
                            <option value="">请选择事件</option>
                            {events.map((event, idx) => (
                                <option key={idx} value={event}>
                                    {event}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Hook 代码编辑器 */}
                {events.length > 0 && selectedEvent && (
                    <CodeEditor
                        code={filterCode}
                        onCodeChange={setFilterCode}
                        onTest={handleTestFilter}
                        onExecute={setIsFilterEnabled}
                        isExecuting={isFilterEnabled}
                        testResult={testResult}
                        templates={eventTemplates}
                    />
                )}

                {/* 监听按钮 */}
                <button
                    onClick={toggleListening}
                    disabled={!iface || !selectedEvent || !address || !rpcUrl}
                    className={`px-4 py-2 rounded transition ${
                        isListening
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                    {isListening ? "停止监听" : "开始监听"}
                </button>

                {isListening && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                        正在监听事件: {selectedEvent}
                    </div>
                )}
                {/* 事件卡片列表 */}
                {eventCards.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-[var(--fg)]">
                                监听到的事件 ({eventCards.length})
                            </div>
                            <button
                                onClick={clearAllEventCards}
                                className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
                            >
                                关闭所有
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {eventCards.map((card) => (
                                <EventCard
                                    key={card.id}
                                    event={card}
                                    onClose={removeEventCard}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 控制台 */}
                <Console logs={logs} onClear={clearLogs} />
            </div>
        </>
    );
}

