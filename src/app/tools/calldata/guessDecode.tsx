"use client";

import { useState } from "react";
import { guessFragment } from "@openchainxyz/abi-guesser";
import { AbiCoder } from "ethers";

import ErrorMessage from "./components/ErrorMessage";
import {
  DecodedResult,
  DecodedResultType,
  EditableDecodedArg,
} from "./components/DecodedResult";
import { parseParamValue, valueToEditString } from "./abiParamCodec";

export default function GuessDecode() {
  const [calldata, setCalldata] = useState("");
  const [result, setResult] = useState<DecodedResultType | null>(null);
  const [editableArgs, setEditableArgs] = useState<EditableDecodedArg[]>([]);
  const [encodeTypes, setEncodeTypes] = useState<string[]>([]);
  const [functionSelector, setFunctionSelector] = useState("");
  const [reEncodedCalldata, setReEncodedCalldata] = useState("");
  const [encodeError, setEncodeError] = useState("");
  const [error, setError] = useState("");

  function handleGuessDecode() {
    if (!calldata || !calldata.startsWith("0x")) {
      setError("请输入有效的 calldata（以 0x 开头）");
      return;
    }

    if (calldata.length < 10) {
      setError("Calldata 太短，至少需要函数选择器（4字节）");
      return;
    }

    setError("");
    setReEncodedCalldata("");
    setEncodeError("");

    try {
      const fragment = guessFragment(calldata);

      if (fragment === null) {
        setError("无法解析 calldata，guessFragment 返回 null");
        setResult(null);
        setEditableArgs([]);
        return;
      }

      const paramTypes = fragment.inputs;

      if (!paramTypes || paramTypes.length === 0) {
        setError("无法获取参数类型");
        setResult(null);
        setEditableArgs([]);
        return;
      }

      const dataWithoutSelector = "0x" + calldata.slice(10);
      const decoded = AbiCoder.defaultAbiCoder().decode(
        paramTypes,
        dataWithoutSelector
      );

      const args = paramTypes.map((paramType, idx) => ({
        name: paramType.name || `param${idx}`,
        type: paramType.type,
        value: decoded[idx],
      }));

      const editable = args.map((arg) => ({
        name: arg.name,
        type: arg.type,
        editValue: valueToEditString(arg.value, arg.type),
      }));

      setFunctionSelector(calldata.slice(0, 10));
      setEncodeTypes(paramTypes.map((p) => p.type));
      setResult({
        functionSignature: fragment.format("full"),
        args,
      });
      setEditableArgs(editable);
    } catch (err: unknown) {
      setError("解码失败：" + (err instanceof Error ? err.message : String(err)));
      setResult(null);
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

    if (!functionSelector || encodeTypes.length === 0) {
      setEncodeError("请先成功猜测并解码");
      return;
    }

    try {
      const values = editableArgs.map((arg) =>
        parseParamValue(arg.type, arg.editValue)
      );
      const encodedParams = AbiCoder.defaultAbiCoder().encode(
        encodeTypes,
        values
      );
      setReEncodedCalldata(functionSelector + encodedParams.slice(2));
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
      <h2 className="font-semibold text-lg">无 ABI 解码 (猜测)</h2>
      <p className="text-sm text-[var(--muted)]">
        输入 calldata，系统会自动猜测函数签名并解码参数。解码后可修改参数并重新编码。
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Calldata:</label>
        <textarea
          value={calldata}
          onChange={(e) => setCalldata(e.target.value.trim())}
          className="w-full h-32 border rounded p-3 font-mono text-sm"
          placeholder="输入 calldata，例如：0xa9059cbb000000000000000000000000..."
        />
        <button
          onClick={handleGuessDecode}
          disabled={!calldata}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          猜测并解码
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {result && (
        <DecodedResult
          result={result}
          editable
          editableArgs={editableArgs}
          onArgChange={handleArgChange}
          onReEncode={handleReEncode}
          reEncodedCalldata={reEncodedCalldata}
          encodeError={encodeError}
          onApplyCalldata={handleApplyCalldata}
          functionLabel="猜测的函数签名"
        />
      )}
    </div>
  );
}
