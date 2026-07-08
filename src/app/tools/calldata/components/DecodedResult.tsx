"use client";

import renderValue from "./formatValue";
import { getParamPlaceholder } from "../paramPlaceholders";
import { ParamValueInput } from "./ParamValueInput";
import { SendToInstantButton } from "./SendToInstantButton";

export type DecodedArg = {
  name: string;
  type: string;
  value: unknown;
};

export type EditableDecodedArg = {
  name: string;
  type: string;
  /** 可编辑的字符串形式 */
  editValue: string;
};

export type DecodedResultType = {
  functionSignature: string;
  args: DecodedArg[];
};

type Props = {
  result: DecodedResultType;
  /** ABI 解码：可编辑并重新编码 */
  editable?: boolean;
  editableArgs?: EditableDecodedArg[];
  onArgChange?: (index: number, value: string) => void;
  onReEncode?: () => void;
  reEncodedCalldata?: string;
  encodeError?: string;
  onApplyCalldata?: () => void;
  functionLabel?: string;
};

export function DecodedResult({
  result,
  editable = false,
  editableArgs,
  onArgChange,
  onReEncode,
  reEncodedCalldata,
  encodeError,
  onApplyCalldata,
  functionLabel = "猜测的函数签名",
}: Props) {
  const argsToRender =
    editable && editableArgs
      ? editableArgs.map((a, idx) => ({
          name: a.name,
          type: a.type,
          editValue: a.editValue,
          rawValue: result.args[idx]?.value,
        }))
      : result.args.map((a) => ({
          name: a.name,
          type: a.type,
          editValue: "",
          rawValue: a.value,
        }));

  return (
    <div className="space-y-4 p-4 bg-[var(--card)] border-[var(--border)] border rounded">
      <div>
        <span className="font-semibold text-sm text-[var(--fg)]">{functionLabel}:</span>
        <div className="mt-1 font-mono text-base font-semibold break-all">
          {result.functionSignature}
        </div>
      </div>

      {argsToRender.length > 0 && (
        <div>
          <span className="font-semibold text-sm text-[var(--fg)]">
            {editable ? "参数（可编辑）:" : "解码的参数:"}
          </span>
          <div className="mt-2 space-y-2">
            {argsToRender.map((arg, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-2 bg-[var(--card)] border-[var(--border)] rounded border"
              >
                <span className="text-[var(--muted)] text-sm w-32 shrink-0 pt-2">
                  {arg.name} ({arg.type})
                </span>
                {editable && onArgChange ? (
                  <ParamValueInput
                    type={arg.type}
                    value={arg.editValue}
                    onChange={(v) => onArgChange(idx, v)}
                    placeholder={getParamPlaceholder(arg.type)}
                    title={getParamPlaceholder(arg.type, { full: true })}
                    className="flex-1"
                  />
                ) : (
                  <div className="flex-1 font-mono text-sm break-all">
                    {renderValue(arg.rawValue, arg.type)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {editable && onReEncode && (
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onReEncode}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
          >
            重新编码
          </button>

          {encodeError && (
            <p className="text-sm text-red-600 dark:text-red-400">{encodeError}</p>
          )}

          {reEncodedCalldata && (
            <div className="space-y-2">
              <label className="text-sm font-medium">重新编码后的 Calldata:</label>
              <textarea
                className="w-full h-28 border border-[var(--border)] rounded p-3 font-mono text-xs bg-[var(--bg)] text-[var(--fg)]"
                readOnly
                value={reEncodedCalldata}
              />
              <div className="flex flex-wrap gap-2">
                {onApplyCalldata && (
                  <button
                    type="button"
                    onClick={onApplyCalldata}
                    className="px-3 py-1.5 text-sm border border-[var(--border)] rounded hover:bg-[var(--hover)]"
                  >
                    写回上方 Calldata 输入框
                  </button>
                )}
                <SendToInstantButton calldata={reEncodedCalldata} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
