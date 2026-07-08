"use client";

import { useEffect, useRef, useState } from "react";
import {
  arrayToRaw,
  currentToRaw,
  decodePrecision,
  encodePrecision,
  isIntegerType,
  PRECISION_OPTIONS,
  transformArrayForDisplay,
  transformCurrentForDisplay,
  type PrecisionSetting,
} from "../numericPrecision";

type Props = {
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
};

function PrecisionSelector({
  setting,
  onChange,
}: {
  setting: PrecisionSetting;
  onChange: (setting: PrecisionSetting) => void;
}) {
  return (
    <select
      value={encodePrecision(setting)}
      onChange={(e) => onChange(decodePrecision(e.target.value))}
      className="shrink-0 w-[5.25rem] border border-[var(--border)] rounded px-1 py-2 text-xs bg-[var(--card)] text-[var(--fg)]"
      title="/N=format 当前值；xN=当前值后补 N 个 0"
    >
      {PRECISION_OPTIONS.map((opt) => (
        <option key={encodePrecision(opt.setting)} value={encodePrecision(opt.setting)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function NumericParamInput({
  type,
  value,
  onChange,
  placeholder,
  title,
  className = "",
}: Props) {
  const [precision, setPrecision] = useState<PrecisionSetting>({
    mode: "raw",
    decimals: 0,
  });
  const [display, setDisplay] = useState(value);
  const lastEmitted = useRef(value);
  const isArray = type.includes("[");

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDisplay(value);
      lastEmitted.current = value;
    }
  }, [value]);

  function emit(raw: string) {
    lastEmitted.current = raw;
    onChange(raw);
  }

  function handleInputChange(nextDisplay: string) {
    setDisplay(nextDisplay);
    const raw = isArray
      ? arrayToRaw(nextDisplay, precision)
      : currentToRaw(nextDisplay, precision);
    emit(raw);
  }

  function handlePrecisionChange(next: PrecisionSetting) {
    const nextDisplay = isArray
      ? transformArrayForDisplay(display, next)
      : transformCurrentForDisplay(display, next);

    setDisplay(nextDisplay);
    setPrecision(next);

    const raw = isArray
      ? arrayToRaw(nextDisplay, next)
      : currentToRaw(nextDisplay, next);
    emit(raw);
  }

  const inputTitle =
    precision.mode === "format"
      ? `${title ?? ""}（/${precision.decimals}：对当前值 format）`
      : precision.mode === "unit"
        ? `${title ?? ""}（x${precision.decimals}：对当前值后补 ${precision.decimals} 个 0）`
        : title;

  return (
    <div className={`flex flex-1 items-center gap-2 min-w-0 ${className}`}>
      <input
        className="flex-1 min-w-0 border border-[var(--border)] rounded p-2 font-mono text-sm bg-[var(--card)] text-[var(--fg)]"
        value={display}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        title={inputTitle}
      />
      <PrecisionSelector setting={precision} onChange={handlePrecisionChange} />
    </div>
  );
}

export function ParamValueInput({
  type,
  value,
  onChange,
  placeholder,
  title,
  className,
}: Props) {
  if (isIntegerType(type)) {
    return (
      <NumericParamInput
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        title={title}
        className={className}
      />
    );
  }

  return (
    <input
      className={`flex-1 min-w-0 border border-[var(--border)] rounded p-2 font-mono text-sm bg-[var(--card)] text-[var(--fg)] ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      title={title}
    />
  );
}
