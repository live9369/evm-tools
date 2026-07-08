import { formatUnits, parseUnits } from "ethers";

export type PrecisionMode = "raw" | "format" | "unit";

export type PrecisionSetting = {
  mode: PrecisionMode;
  decimals: number;
};

const DECIMAL_OPTIONS = [6, 8, 9, 18] as const;

function formatPrecisionLabel(decimals: number): string {
  return `/${decimals}`;
}

function unitPrecisionLabel(decimals: number): string {
  return `x${decimals}`;
}

export const PRECISION_OPTIONS: { label: string; setting: PrecisionSetting }[] = [
  { label: "原始", setting: { mode: "raw", decimals: 0 } },
  ...DECIMAL_OPTIONS.flatMap((d) => [
    { label: formatPrecisionLabel(d), setting: { mode: "format" as const, decimals: d } },
    { label: unitPrecisionLabel(d), setting: { mode: "unit" as const, decimals: d } },
  ]),
];

export function encodePrecision(setting: PrecisionSetting): string {
  if (setting.mode === "raw") return "raw";
  return `${setting.mode}:${setting.decimals}`;
}

export function decodePrecision(key: string): PrecisionSetting {
  if (key === "raw") return { mode: "raw", decimals: 0 };
  const [mode, dec] = key.split(":");
  if (mode === "format" || mode === "unit") {
    return { mode, decimals: Number(dec) };
  }
  return { mode: "raw", decimals: 0 };
}

export function isIntegerType(type: string): boolean {
  const base = type.split("[")[0];
  return base.startsWith("uint") || base.startsWith("int");
}

/** xN：在当前整数后面补 N 个 0 */
export function appendUnitZeros(current: string, decimals: number): string {
  const trimmed = current.trim();
  if (!trimmed) return "";
  if (decimals === 0) return trimmed;

  const base = trimmed.split(".")[0];
  if (!/^-?\d+$/.test(base)) return trimmed;
  return base + "0".repeat(decimals);
}

/** 仅根据当前输入值做展示变换，不读取历史 raw */
export function transformCurrentForDisplay(
  current: string,
  setting: PrecisionSetting
): string {
  if (!current.trim()) return current;
  if (setting.mode === "raw") return current;

  if (setting.mode === "format") {
    try {
      return formatUnits(current.trim(), setting.decimals);
    } catch {
      return current;
    }
  }

  return appendUnitZeros(current, setting.decimals);
}

/** 将当前输入值转为链上编码用的 raw */
export function currentToRaw(
  current: string,
  setting: PrecisionSetting
): string {
  if (!current.trim()) return "";
  if (setting.mode === "raw") return current.trim();

  if (setting.mode === "format") {
    try {
      return parseUnits(current.trim(), setting.decimals).toString();
    } catch {
      return current.trim();
    }
  }

  return appendUnitZeros(current, setting.decimals);
}

function transformArrayItem(current: string, setting: PrecisionSetting): string {
  return transformCurrentForDisplay(current, setting);
}

function rawArrayItem(current: string, setting: PrecisionSetting): string {
  return currentToRaw(current, setting);
}

export function transformArrayForDisplay(
  current: string,
  setting: PrecisionSetting
): string {
  if (!current.trim()) return current;
  if (setting.mode === "raw") return current;

  try {
    const parsed = JSON.parse(current);
    if (Array.isArray(parsed)) {
      return JSON.stringify(
        parsed.map((item) => transformArrayItem(String(item), setting))
      );
    }
  } catch {
  }

  return current
    .split(",")
    .map((part) => transformArrayItem(part.trim(), setting))
    .join(", ");
}

export function arrayToRaw(current: string, setting: PrecisionSetting): string {
  if (!current.trim()) return "";

  try {
    const parsed = JSON.parse(current);
    if (Array.isArray(parsed)) {
      return JSON.stringify(
        parsed.map((item) => rawArrayItem(String(item), setting))
      );
    }
  } catch {
  }

  return current
    .split(",")
    .map((part) => rawArrayItem(part.trim(), setting))
    .filter(Boolean)
    .join(", ");
}
