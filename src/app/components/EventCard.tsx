"use client";

export interface EventCardData {
    id: string;
    eventName: string;
    args: Array<{ name: string; type: string; value: string }>;
    blockNumber?: number;
    transactionHash?: string;
}

interface EventCardProps {
    event: EventCardData;
    onClose: (id: string) => void;
}

export function EventCard({ event, onClose }: EventCardProps) {
    return (
        <div className="p-4 bg-[var(--card)] border-[var(--border)] border rounded shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                    {/* 事件名称 */}
                    <div>
                        <h3 className="font-semibold text-base text-[var(--fg)]">{event.eventName}</h3>
                    </div>

                    {/* 事件参数 */}
                    {event.args.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-[var(--muted)]">参数:</div>
                            <div className="space-y-2">
                                {event.args.map((arg, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm">
                                        <span className="text-[var(--muted)] font-mono text-xs w-32 shrink-0">
                                            {arg.name}
                                        </span>
                                        <span className="text-[var(--muted)] font-mono text-xs w-24 shrink-0">
                                            ({arg.type})
                                        </span>
                                        <span className="text-[var(--fg)] font-mono break-all flex-1">
                                            {arg.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 区块和交易信息 */}
                    <div className="flex gap-4 text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
                        {event.blockNumber && (
                            <div>
                                <span className="font-medium">区块:</span>{" "}
                                <span className="font-mono">{event.blockNumber}</span>
                            </div>
                        )}
                        {event.transactionHash && (
                            <div>
                                <span className="font-medium">交易:</span>{" "}
                                <span className="font-mono">{event.transactionHash.slice(0, 10)}...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 关闭按钮 */}
                <button
                    onClick={() => onClose(event.id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--fg)] transition"
                    aria-label="关闭"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}

