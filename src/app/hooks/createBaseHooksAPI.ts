import * as ethers from "ethers";
import { JsonRpcProvider } from "ethers";
import { LogEntry } from "@/app/components/Console";

export interface BaseHooksAPI {
    provider: JsonRpcProvider | null;
    ethers: typeof ethers;
    log: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export function createBaseHooksAPI(
    provider: JsonRpcProvider | null,
    onLog: (log: LogEntry) => void
): BaseHooksAPI {
    return {
        provider: provider || null,
        ethers: ethers,
        
        log: (...args: unknown[]) => {
            const logId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            onLog({
                id: logId,
                method: "log",
                data: args,
                timestamp: Date.now(),
            });
        },
        
        info: (...args: unknown[]) => {
            const logId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            onLog({
                id: logId,
                method: "info",
                data: args,
                timestamp: Date.now(),
            });
        },
        
        warn: (...args: unknown[]) => {
            const logId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            onLog({
                id: logId,
                method: "warn",
                data: args,
                timestamp: Date.now(),
            });
        },
        
        error: (...args: unknown[]) => {
            const logId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            onLog({
                id: logId,
                method: "error",
                data: args,
                timestamp: Date.now(),
            });
        },
    };
}

