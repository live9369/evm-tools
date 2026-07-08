import { CodeTemplate } from "../types";

export const customTemplate: CodeTemplate = {
    id: "event-custom",
    name: "自定义",
    description: "自定义事件卡片",
    color: "orange",
    code: `// 自定义模板：自定义事件卡片
hooks.addEventCard({
    eventName: "CustomEvent",
    args: [
        { name: "from", type: "address", value: String(hooks.eventArgs.from) },
        { name: "to", type: "address", value: String(hooks.eventArgs.to) }
    ]
});`
};

