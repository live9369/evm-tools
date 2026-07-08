import { CodeTemplate } from "../types";

export const logTemplate: CodeTemplate = {
    id: "event-log",
    name: "日志",
    description: "记录事件日志",
    color: "gray",
    code: `// 日志模板：记录事件信息
hooks.log("事件触发:", hooks.eventArgs);
hooks.info("区块号:", eventObj?.blockNumber);
hooks.warn("交易哈希:", eventObj?.transactionHash);`
};

