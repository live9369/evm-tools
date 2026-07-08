"use client";

import { useState } from "react";
import { AbiCoder } from "ethers";
import { getParamPlaceholder } from "./paramPlaceholders";
import { ParamValueInput } from "./components/ParamValueInput";
import { CalldataOutputPanel } from "./components/CalldataOutputPanel";

// EVM 类型列表
const EVM_TYPES = [
    "uint8", "uint16", "uint32", "uint64", "uint128", "uint256",
    "int8", "int16", "int32", "int64", "int128", "int256",
    "bool",
    "address",
    "bytes", "bytes1", "bytes2", "bytes3", "bytes4", "bytes8", "bytes16", "bytes32",
    "string",
    // 数组类型
    "uint8[]", "uint256[]", "int256[]", "bool[]", "address[]", "bytes32[]", "string[]",
    // 二维数组类型
    "bytes32[][]", "address[][]", "uint256[][]",
    // 固定大小数组
    "uint256[2]", "uint256[3]", "uint256[4]", "address[2]", "address[3]",
    // 嵌套类型
    "tuple", "tuple[]"
];

type Param = {
    id: string;
    type: string;
    value: string;
};

export default function BuildCustom(){
    const [params, setParams] = useState<Param[]>([
        { id: "1", type: "uint256", value: "" }
    ]);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");

    // 添加参数
    function addParam(){
        const newId = String(Date.now());
        setParams([...params, { id: newId, type: "uint256", value: "" }]);
    }

    // 删除参数
    function removeParam(id: string){
        if (params.length <= 1) {
            setError("至少需要保留一个参数");
            setTimeout(() => setError(""), 3000);
            return;
        }
        setParams(params.filter(p => p.id !== id));
    }

    // 更新参数类型
    function updateParamType(id: string, type: string){
        setParams(params.map(p => 
            p.id === id ? { ...p, type, value: "" } : p
        ));
    }

    // 更新参数值
    function updateParamValue(id: string, value: string){
        setParams(params.map(p => 
            p.id === id ? { ...p, value } : p
        ));
    }

    // 编码参数
    function encode(){
        setError("");
        setResult("");

        try{
            const types = params.map(p => p.type);
            const values = params.map(p => {
                const val = p.value.trim();
                
                // 处理不同类型的值
                if (p.type === "bool") {
                    return val === "true" || val === "1";
                }
                if (p.type.startsWith("uint") || p.type.startsWith("int")) {
                    return val;
                }
                if (p.type === "address") {
                    if (!val.startsWith("0x")) {
                        return "0x" + val;
                    }
                    return val;
                }
                // 数组须先于 bytes：`bytes32[]` / `bytes[]` 也以 "bytes" 开头
                if (p.type.includes("[]") || p.type.match(/\[\d+\]/)) {
                    // 对于二维数组，必须使用 JSON 格式
                    if (p.type.includes("[][]")) {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed)) {
                                return parsed;
                            }
                            throw new Error("解析结果不是数组");
                        } catch (e) {
                            throw new Error(`二维数组 ${p.type} 必须使用 JSON 格式，例如：[["0x...", "0x..."], ["0x..."]]。错误：${e instanceof Error ? e.message : String(e)}`);
                        }
                    }

                    // 一维数组：先尝试 JSON 解析，失败则按逗号分割
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                            return parsed;
                        }
                        throw new Error("解析结果不是数组");
                    } catch {
                        return val.split(",").map(v => v.trim()).filter(v => v);
                    }
                }
                if (p.type.startsWith("bytes")) {
                    if (!val.startsWith("0x")) {
                        return "0x" + val;
                    }
                    return val;
                }
                if (p.type === "string") {
                    return val;
                }

                return val;
            });

            const abiCoder = AbiCoder.defaultAbiCoder();
            const encoded = abiCoder.encode(types, values);
            
            setResult(encoded);
        }catch(err: unknown){
            setError("编码失败：" + (err instanceof Error ? err.message : String(err)));
        }
    }

    return(
        <div className="space-y-6">
            <h2 className="font-semibold text-lg">自定义构造</h2>
            <p className="text-sm text-gray-600">
                手动选择类型并输入参数值，生成编码后的 calldata
            </p>

            {/* 参数列表 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">参数:</span>
                    <button
                        onClick={addParam}
                        className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                        + 添加参数
                    </button>
                </div>

                {params.map((param, idx) => (
                    <div key={param.id} className="flex items-center gap-3 p-3 bg-[var(--card)] border-[var(--border)] border rounded">
                        <span className="text-[var(--muted)] text-sm w-8 shrink-0">
                            #{idx + 1}
                        </span>
                        
                        {/* 类型选择器（支持搜索） */}
                        <TypeSelector
                            value={param.type}
                            onChange={(type) => updateParamType(param.id, type)}
                        />

                        {/* 值输入框 */}
                        <ParamValueInput
                            type={param.type}
                            value={param.value}
                            onChange={(v) => updateParamValue(param.id, v)}
                            placeholder={getParamPlaceholder(param.type)}
                            title={getParamPlaceholder(param.type, { full: true })}
                            className="flex-1"
                        />

                        {/* 删除按钮 */}
                        <button
                            onClick={() => removeParam(param.id)}
                            disabled={params.length <= 1}
                            className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            删除
                        </button>
                    </div>
                ))}
            </div>

            {/* 编码按钮 */}
            <button
                onClick={encode}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
                生成 calldata
            </button>

            {/* 错误提示 */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {result && <CalldataOutputPanel calldata={result} />}
        </div>
    )
}

// 类型选择器组件（支持搜索）
function TypeSelector({ value, onChange }: { value: string; onChange: (type: string) => void }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [filteredTypes, setFilteredTypes] = useState(EVM_TYPES);

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        const query = e.target.value.toLowerCase();
        setSearch(query);
        
        if (query) {
            setFilteredTypes(EVM_TYPES.filter(type => 
                type.toLowerCase().includes(query)
            ));
        } else {
            setFilteredTypes(EVM_TYPES);
        }
    }

    function selectType(type: string) {
        onChange(type);
        setIsOpen(false);
        setSearch("");
        setFilteredTypes(EVM_TYPES);
    }

    return (
        <div className="relative w-40">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 text-sm border-[var(--border)] border rounded bg-[var(--card)] text-[var(--fg)] text-left hover:bg-[var(--hover)] transition"
            >
                {value || "选择类型"}
            </button>

            {isOpen && (
                <>
                    <div className="absolute z-10 w-full mt-1 bg-[var(--card)] border-[var(--border)] border rounded shadow-lg max-h-60 overflow-hidden">
                        {/* 搜索框 */}
                        <div className="p-2 border-b border-[var(--border)]">
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearch}
                                placeholder="搜索类型..."
                                className="w-full px-2 py-1.5 text-sm border-[var(--border)] border rounded bg-[var(--bg)] text-[var(--fg)]"
                                autoFocus
                            />
                        </div>

                        {/* 类型列表 */}
                        <div className="max-h-48 overflow-y-auto">
                            {filteredTypes.length > 0 ? (
                                filteredTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => selectType(type)}
                                        className={`w-full px-3 py-2 text-sm text-left hover:bg-[var(--hover)] transition ${
                                            value === type ? "bg-[var(--hover)] font-medium" : ""
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-[var(--muted)]">
                                    未找到匹配的类型
                                </div>
                            )}
                        </div>
                    </div>
                    {/* 点击外部关闭 */}
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => {
                            setIsOpen(false);
                            setSearch("");
                            setFilteredTypes(EVM_TYPES);
                        }}
                    />
                </>
            )}
        </div>
    );
}
