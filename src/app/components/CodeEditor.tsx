"use client";

import Editor from "react-simple-code-editor";
// @ts-expect-error - prismjs 没有完整的类型定义
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import { CodeTemplate } from "@/app/templates/types";

interface CodeEditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    onTest: () => void;
    onExecute: (enabled: boolean) => void;
    isExecuting: boolean;
    testResult?: { success: boolean; result: unknown; error?: string };
    templates?: CodeTemplate[];
}

export function CodeEditor({
    code,
    onCodeChange,
    onTest,
    onExecute,
    isExecuting,
    testResult,
    templates = []
}: CodeEditorProps) {
    const handleTemplateClick = (template: CodeTemplate) => {
        onCodeChange(template.code);
    };

    const getColorClasses = (color: CodeTemplate["color"]) => {
        const colors = {
            blue: "bg-blue-500 hover:bg-blue-600 text-white",
            green: "bg-green-500 hover:bg-green-600 text-white",
            purple: "bg-purple-500 hover:bg-purple-600 text-white",
            orange: "bg-orange-500 hover:bg-orange-600 text-white",
            red: "bg-red-500 hover:bg-red-600 text-white",
            gray: "bg-gray-500 hover:bg-gray-600 text-white",
        };
        return colors[color];
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Hooks:</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => onExecute(!isExecuting)}
                        className={`px-3 py-1.5 text-sm rounded transition ${
                            isExecuting
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                    >
                        {isExecuting ? "✓ 已启用" : "AfterHook"}
                    </button>
                    <button
                        onClick={onTest}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                    >
                        测试
                    </button>
                </div>
            </div>
            
            {/* 模板按钮组 */}
            {templates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleTemplateClick(template)}
                            className={`px-3 py-1.5 text-xs rounded transition ${getColorClasses(template.color)}`}
                            title={template.description}
                        >
                            {template.name}
                        </button>
                    ))}
                </div>
            )}
            <div className="border-[var(--border)] border rounded overflow-hidden bg-[var(--card)]">
                <Editor
                    value={code}
                    onValueChange={onCodeChange}
                    highlight={(code) => highlight(code, languages.javascript)}
                    padding={12}
                    placeholder="// hooks 对象已自动注入，包含 eventArgs, provider, ethers 等&#10;// 点击上方模板按钮快速填充代码&#10;&#10;// 示例：添加事件卡片&#10;hooks.addEventCard({});"
                    style={{
                        fontFamily: '"Fira Code", "Fira Mono", "Consolas", "Monaco", monospace',
                        fontSize: 14,
                        backgroundColor: "var(--card)",
                        color: "var(--fg)",
                        minHeight: "150px",
                        outline: "none",
                        width: "100%",
                    }}
                    textareaClassName="editor-textarea"
                    preClassName="editor-pre"
                />
            </div>
            <style jsx global>{`
                .editor-textarea {
                    outline: none !important;
                    border: none !important;
                    background: transparent !important;
                    color: var(--fg) !important;
                    font-family: "Fira Code", "Fira Mono", "Consolas", "Monaco", monospace !important;
                    font-size: 14px !important;
                    padding: 12px !important;
                    resize: none !important;
                }
                .editor-pre {
                    margin: 0 !important;
                    padding: 12px !important;
                    background: var(--card) !important;
                }
                
                /* 日间模式语法高亮颜色 */
                :root {
                    --code-comment: #6b7280;
                    --code-keyword: #2563eb;
                    --code-string: #059669;
                    --code-number: #dc2626;
                    --code-function: #7c3aed;
                    --code-operator: #1a1a1a;
                    --code-variable: #ea580c;
                    --code-punctuation: #1a1a1a;
                }
                
                /* 夜间模式语法高亮颜色 */
                .dark {
                    --code-comment: #9ca3af;
                    --code-keyword: #66d9ef;
                    --code-string: #a6e22e;
                    --code-number: #f92672;
                    --code-function: #e6db74;
                    --code-operator: #f5f6f8;
                    --code-variable: #fd971f;
                    --code-punctuation: #f5f6f8;
                }
                
                /* 应用语法高亮颜色 */
                .token.comment,
                .token.prolog,
                .token.doctype,
                .token.cdata {
                    color: var(--code-comment);
                }
                .token.punctuation {
                    color: var(--code-punctuation);
                }
                .token.property,
                .token.tag,
                .token.boolean,
                .token.number,
                .token.constant,
                .token.symbol,
                .token.deleted {
                    color: var(--code-number);
                }
                .token.selector,
                .token.attr-name,
                .token.string,
                .token.char,
                .token.builtin,
                .token.inserted {
                    color: var(--code-string);
                }
                .token.operator,
                .token.entity,
                .token.url,
                .language-css .token.string,
                .style .token.string {
                    color: var(--code-operator);
                }
                .token.atrule,
                .token.attr-value,
                .token.keyword {
                    color: var(--code-keyword);
                }
                .token.function,
                .token.class-name {
                    color: var(--code-function);
                }
                .token.regex,
                .token.important,
                .token.variable {
                    color: var(--code-variable);
                }
            `}</style>
            {testResult && (
                <div className={`p-3 rounded text-sm ${
                    testResult.success
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                    {testResult.success ? (
                        <div>
                            <div className="font-medium">测试结果:</div>
                            <div className="mt-1 font-mono text-xs">
                                {typeof testResult.result === "boolean" 
                                    ? (testResult.result ? "true (显示)" : "false (过滤)")
                                    : String(testResult.result)
                                }
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="font-medium">执行错误:</div>
                            <div className="mt-1 font-mono text-xs">{testResult.error}</div>
                        </div>
                    )}
                </div>
            )}
            {isExecuting && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
                    ⚡ 代码已启用，将在每个事件解析后自动执行
                </div>
            )}
        </div>
    );
}

