"use client";

import { useState } from "react";
import { Interface, ParamType } from "ethers";
import { getParamPlaceholder } from "./paramPlaceholders";
import { ParamValueInput } from "./components/ParamValueInput";
import { CalldataOutputPanel } from "./components/CalldataOutputPanel";

export default function BuildFromABI(){
    const [abi, setABI] = useState("");
    const [iface, setIface] = useState<Interface | null>(null);
    const [selectedFn, setSelectedFn] = useState<string>("");
    const [params, setParams] = useState<{name:string, type:string, value:string}[]>([]);
    const [result, setResult] = useState("");
  
    // 解析 ABI
    function handleLoadABI(){
      try{
        const parsed = JSON.parse(abi);
        const iface = new Interface(parsed);
  
        setIface(iface);
        setSelectedFn("");
        setParams([]);
        setResult("");
        // alert("ABI 解析成功！");
      }catch(e){
        alert("ABI 解析失败，请检查 JSON 格式");
      }
    }
  
    // 函数选择
    function handleFnChange(fnName:string){
      setSelectedFn(fnName);
  
      const fragment = iface?.getFunction(fnName);
      const inputs = fragment?.inputs.map((input:ParamType)=>({
        name: input.name,
        type: input.type,
        value: ""
      }));
  
      setParams(inputs || []);
    }
  
    // 修改参数
    function updateParam(index:number, value:string){
      const newParams = [...params];
      newParams[index].value = value;
      setParams(newParams);
    }
  
    // 编码 calldata
    function build(){
      try{
        const types  = params.map(p=>p.type);
        const values = params.map(p => {
          const val = p.value.trim();
          
          // 处理数组类型（包括一维和二维数组）
          if (p.type.includes("[]") || p.type.match(/\[\d+\]/)) {
            try {
              // 尝试解析为 JSON 数组
              return JSON.parse(val);
            } catch {
              // 如果不是 JSON，尝试按逗号分割（仅适用于简单的一维数组）
              return val.split(",").map(v => v.trim()).filter(v => v);
            }
          }
          
          // 处理布尔值
          if (p.type === "bool") {
            return val === "true" || val === "1";
          }
          
          // 处理地址（确保有 0x 前缀）
          if (p.type === "address") {
            if (!val.startsWith("0x")) {
              return "0x" + val;
            }
            return val;
          }
          
          // 处理 bytes 类型（确保有 0x 前缀）
          if (p.type.startsWith("bytes")) {
            if (!val.startsWith("0x")) {
              return "0x" + val;
            }
            return val;
          }
          
          // 其他类型直接返回
          return val;
        });
  
        const calldata = iface?.encodeFunctionData(selectedFn, values);
  
        setResult(calldata || "");
      }catch(err){
        alert("编码失败：" + err);
      }
    }
  
    return(
      <div className="space-y-6">
  
        <h2 className="font-semibold text-lg">根据 ABI 构造</h2>
  
        {/* 输入 ABI */}
        <textarea
          value={abi}
          onChange={(e)=>setABI(e.target.value)}
          className="w-full h-40 border rounded p-3 font-mono"
          placeholder='[{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"type":"bool"}]}]'
        />
  
        <button onClick={handleLoadABI}
          className="px-4 py-2 bg-blue-500 text-white rounded">
          载入 ABI
        </button>
  
  
        {/* 选择函数 */}
        {iface && (
          <div className="space-y-3">
            <p className="font-semibold">选择函数:</p>
  
            <select
              className="border rounded p-2"
              value={selectedFn}
              onChange={(e)=>handleFnChange(e.target.value)}
            >
              <option value="">请选择函数</option>
              {iface.fragments
                .filter(f => {
                    if (f.type !== "function") return false;
                    // 排除 view 和 pure 函数（只读函数不需要 calldata）
                    const funcFragment = f as { stateMutability?: string };
                    return funcFragment.stateMutability !== "view" && 
                        funcFragment.stateMutability !== "pure";
                })
                .map(f => f.format("full"))
                .map((fn, idx) => (
                  <option key={idx} value={fn}>{fn}</option>
                ))}
            </select>
          </div>
        )}
  
  
        {/* 渲染参数输入 */}
        {selectedFn && params.length>0 && (
          <div className="space-y-3">
            <p className="font-semibold">参数:</p>
  
            {params.map((p,idx)=>(
              <div key={idx} className="flex items-center gap-4">
                <span className="text-gray-500 w-32">
                  {p.name} ({p.type})
                </span>
  
                <ParamValueInput
                  type={p.type}
                  value={p.value}
                  onChange={(v) => updateParam(idx, v)}
                  placeholder={getParamPlaceholder(p.type)}
                  title={getParamPlaceholder(p.type, { full: true })}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        )}
  
  
        {/* 构造按钮 */}
        {selectedFn && (
          <button
            onClick={build}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            生成 calldata
          </button>
        )}
  
  
        {result && <CalldataOutputPanel calldata={result} />}
  
      </div>
    )
  }
  