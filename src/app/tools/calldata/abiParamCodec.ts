/** 将解码后的值转为可编辑字符串 */
export function valueToEditString(value: unknown, type: string): string {
  if (value === null || value === undefined) return "";

  if (type.includes("[]") || Array.isArray(value)) {
    if (Array.isArray(value)) {
      return JSON.stringify(normalizeForJson(value));
    }
  }

  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return String(value);
  return String(value);
}

function normalizeForJson(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeForJson);
  return value;
}

/** 将编辑框字符串解析为 ABI 编码所需的值 */
export function parseParamValue(type: string, raw: string): unknown {
  const val = raw.trim();

  if (type.includes("[]") || type.match(/\[\d+\]/)) {
    try {
      return JSON.parse(val);
    } catch {
      return val.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }

  if (type === "bool") {
    return val === "true" || val === "1";
  }

  if (type === "address") {
    return val.startsWith("0x") ? val : `0x${val}`;
  }

  if (type.startsWith("bytes")) {
    return val.startsWith("0x") ? val : `0x${val}`;
  }

  return val;
}
