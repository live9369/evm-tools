"use client";

export default function renderValue(value: unknown, type: string) {
    // 判断是否为数组类型（通过类型字符串或实际值）
    const isArray = type.includes('[]') || Array.isArray(value);
    
    if (isArray && Array.isArray(value)) {
        // 数组类型：显示长度和每个元素一行
        return (
            <div className="space-y-1">
                <div className="text-[var(--muted)] text-xs mb-1">
                    长度: {value.length}
                </div>
                {value.map((item, idx) => (
                    <div key={idx}>{String(item)}</div>
                ))}
            </div>
        );
    }
    
    // 非数组类型：直接显示
    return <span>{String(value)}</span>;
}