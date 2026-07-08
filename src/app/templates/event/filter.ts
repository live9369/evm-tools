import { CodeTemplate } from "../types";

export const filterTemplate: CodeTemplate = {
    id: "event-filter",
    name: "过滤",
    description: "只添加满足条件的事件",
    color: "green",
    code: `// 过滤模板：只添加满足条件的事件
if (hooks.eventArgs.value > 1000000n) {
    hooks.addEventCard({});
}`
};

