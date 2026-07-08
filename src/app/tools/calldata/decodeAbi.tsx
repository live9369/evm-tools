"use client";

import { useState } from "react";
import { Interface, ParamType } from "ethers";

import ErrorMessage from "./components/ErrorMessage";
import {
  DecodedResult,
  DecodedResultType,
  EditableDecodedArg,
} from "./components/DecodedResult";
import { parseParamValue, valueToEditString } from "./abiParamCodec";

export default function DecodeABI() {
  const [abi, setABI] = useState("");
  const [calldata, setCalldata] = useState("");
  const [iface, setIface] = useState<Interface | null>(null);
  const [decodedResult, setDecodedResult] = useState<DecodedResultType | null>(
    null
  );
  const [encodeKey, setEncodeKey] = useState("");
  const [editableArgs, setEditableArgs] = useState<EditableDecodedArg[]>([]);
  const [reEncodedCalldata, setReEncodedCalldata] = useState("");
  const [encodeError, setEncodeError] = useState("");
  const [error, setError] = useState("");

  function getInterface(): Interface | null {
    if (iface) return iface;
    if (!abi) return null;
    try {
      const parsed = JSON.parse(abi);
      const created = new Interface(parsed);
      setIface(created);
      return created;
    } catch {
      return null;
    }
  }

  function handleDecode() {
    setReEncodedCalldata("");
    setEncodeError("");

    const interfaceToUse = getInterface();

    if (!interfaceToUse) {
      setError("ABI 解析失败，请检查 JSON 格式");
      return;
    }
    if (!calldata || !calldata.startsWith("0x")) {
      setError("请输入有效的 calldata（以 0x 开头）");
      return;
    }

    try {
      const parsed = interfaceToUse.parseTransaction({ data: calldata });

      if (!parsed) {
        setError("无法解析 calldata，请检查格式是否正确");
        setDecodedResult(null);
        setEditableArgs([]);
        return;
      }

      const fragment = interfaceToUse.getFunction(parsed.name);
      const fnKey = fragment?.format("full") ?? parsed.signature ?? parsed.name;

      const args =
        fragment?.inputs.map((input: ParamType, idx: number) => ({
          name: input.name || `param${idx}`,
          type: input.type,
          value: parsed.args[idx],
        })) ?? [];

      const editable = args.map((arg) => ({
        name: arg.name,
        type: arg.type,
        editValue: valueToEditString(arg.value, arg.type),
      }));

      setEncodeKey(fnKey);
      setDecodedResult({
        functionSignature: fnKey,
        args,
      });
      setEditableArgs(editable);
      setError("");
    } catch (err: unknown) {
      setError("解码失败：" + (err instanceof Error ? err.message : String(err)));
      setDecodedResult(null);
      setEditableArgs([]);
    }
  }

  function handleArgChange(index: number, value: string) {
    setEditableArgs((prev) =>
      prev.map((a, i) => (i === index ? { ...a, editValue: value } : a))
    );
    setReEncodedCalldata("");
    setEncodeError("");
  }

  function handleReEncode() {
    setEncodeError("");
    setReEncodedCalldata("");

    const interfaceToUse = getInterface();
    if (!interfaceToUse || !encodeKey) {
      setEncodeError("请先成功解码并载入 ABI");
      return;
    }

    try {
      const values = editableArgs.map((arg) =>
        parseParamValue(arg.type, arg.editValue)
      );
      const encoded = interfaceToUse.encodeFunctionData(encodeKey, values);
      setReEncodedCalldata(encoded);
    } catch (err: unknown) {
      setEncodeError(
        "编码失败：" + (err instanceof Error ? err.message : String(err))
      );
    }
  }

  function handleApplyCalldata() {
    if (reEncodedCalldata) {
      setCalldata(reEncodedCalldata);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">根据 ABI 解码</h2>
      <p className="text-sm text-[var(--muted)]">
        解码后可修改参数并重新编码，用于微调 swap 等交易参数。
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">ABI JSON:</label>
        <textarea
          value={abi}
          onChange={(e) => {
            setABI(e.target.value);
            setIface(null);
          }}
          className="w-full h-40 border rounded p-3 font-mono text-sm"
          placeholder='[{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"type":"bool"}]}]'
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Calldata:</label>
        <textarea
          value={calldata}
          onChange={(e) => setCalldata(e.target.value.trim())}
          className="w-full h-32 border rounded p-3 font-mono text-sm"
          placeholder="输入 calldata，例如：0xa9059cbb000000000000000000000000..."
        />
        <button
          onClick={handleDecode}
          disabled={!calldata}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          解码
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {decodedResult && (
        <DecodedResult
          result={decodedResult}
          editable
          editableArgs={editableArgs}
          onArgChange={handleArgChange}
          onReEncode={handleReEncode}
          reEncodedCalldata={reEncodedCalldata}
          encodeError={encodeError}
          onApplyCalldata={handleApplyCalldata}
          functionLabel="函数"
        />
      )}
    </div>
  );
}
