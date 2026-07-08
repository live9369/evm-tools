import { CodeTemplate } from "../types";

export const queryTemplate: CodeTemplate = {
    id: "event-query",
    name: "查询",
    description: "查询链上数据并记录",
    color: "purple",
    code: `// 查询模板：查询链上数据
const balance = await hooks.provider.getBalance(hooks.eventArgs.from);
hooks.log("发送方余额:", balance.toString());
hooks.addEventCard({});`
};

