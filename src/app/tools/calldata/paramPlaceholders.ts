const SAMPLE_ADDRESS =
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
const SAMPLE_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const SAMPLE_BYTES32_B =
  "0x0000000000000000000000000000000000000000000000000000000000000002";

/** 截断 hex / 地址：0x742d35...0bEb */
export function truncateHex(
  value: string,
  head = 8,
  tail = 4
): string {
  const v = value.startsWith("0x") ? value : `0x${value}`;
  if (v.length <= head + tail + 2) return v;
  return `${v.slice(0, head)}...${v.slice(-tail)}`;
}

type PlaceholderOptions = {
  /** true 时返回完整示例（用于 title 悬停提示） */
  full?: boolean;
};

/** 根据 Solidity ABI 类型返回输入框 placeholder 示例 */
export function getParamPlaceholder(
  type: string,
  options?: PlaceholderOptions
): string {
  const full = options?.full ?? false;
  const t = type.trim();

  if (t.includes("[][]")) {
    if (t.startsWith("bytes32")) {
      return full
        ? `[["${SAMPLE_BYTES32}", "${SAMPLE_BYTES32_B}"], ["${SAMPLE_BYTES32}"]]`
        : `[["${truncateHex(SAMPLE_BYTES32)}", "${truncateHex(SAMPLE_BYTES32_B)}"], ["${truncateHex(SAMPLE_BYTES32)}"]]`;
    }
    if (t.startsWith("address")) {
      const a = full ? SAMPLE_ADDRESS : truncateHex(SAMPLE_ADDRESS);
      return full
        ? `[["${SAMPLE_ADDRESS}"], ["${SAMPLE_ADDRESS}"]]`
        : `[["${truncateHex(SAMPLE_ADDRESS)}"], ["0x..."]]`;
    }
    if (t.startsWith("uint") || t.startsWith("int")) {
      return "[[1000, 2000], [3000]]";
    }
    return '[["值1"], ["值2"]]  (JSON 二维数组)';
  }

  if (t.includes("[]")) {
    if (t.startsWith("bytes32")) {
      const a = full ? SAMPLE_BYTES32 : truncateHex(SAMPLE_BYTES32);
      const b = full
        ? SAMPLE_BYTES32_B
        : truncateHex(SAMPLE_BYTES32_B);
      return `["${a}", "${b}"]`;
    }
    if (t.startsWith("address")) {
      const a = full ? SAMPLE_ADDRESS : truncateHex(SAMPLE_ADDRESS);
      return full
        ? `["${SAMPLE_ADDRESS}", "${SAMPLE_ADDRESS}"]`
        : `["${truncateHex(SAMPLE_ADDRESS)}", "0x..."]`;
    }
    if (t.startsWith("uint") || t.startsWith("int")) {
      return "[1000, 2000] 或 1000, 2000";
    }
    if (t === "bool[]") return "[true, false]";
    if (t === "string[]") return '["hello", "world"]';
    if (t.startsWith("bytes")) return '["0x1234", "0xabcd"]';
    return '["值1", "值2"]  (JSON 数组)';
  }

  const fixed = t.match(/^(\w+)\[(\d+)\]$/);
  if (fixed) {
    const [, inner, size] = fixed;
    const n = Math.min(parseInt(size, 10), 4);
    const samples = Array.from({ length: n }, (_, i) =>
      scalarExample(inner, i, full)
    );
    return `[${samples.join(", ")}] 或 ${samples.join(", ")}`;
  }

  return scalarExample(t, 0, full);
}

function scalarExample(type: string, index: number, full: boolean): string {
  if (type === "bool") return index % 2 === 0 ? "true" : "false";
  if (type === "address") {
    return full ? SAMPLE_ADDRESS : truncateHex(SAMPLE_ADDRESS);
  }
  if (type === "string") return "hello";
  if (type === "bytes") return "0x1234abcd";
  if (type === "bytes32") {
    const raw =
      index === 0 ? SAMPLE_BYTES32 : SAMPLE_BYTES32_B;
    return full ? raw : truncateHex(raw);
  }
  if (type.startsWith("bytes")) {
    return "0x1234abcd";
  }
  if (type.startsWith("uint") || type.startsWith("int")) {
    return String(1000 * (index + 1));
  }
  if (type === "tuple" || type.startsWith("tuple")) {
    return full
      ? `{"to":"${SAMPLE_ADDRESS}","amount":1000}`
      : `{"to":"${truncateHex(SAMPLE_ADDRESS)}","amount":1000}`;
  }
  return `示例值 (${type})`;
}
