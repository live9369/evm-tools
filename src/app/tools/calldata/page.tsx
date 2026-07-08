"use client";

import { useState } from "react";
import GuessDecode from "./guessDecode";
import BuildFromABI from "./buildFromAbi";
import DecodeABI from "./decodeAbi";
import BuildCustom from "./buildCustom";

const tabs = [
  {key:"guess", label:"💡 无 ABI 解码 (猜测)"},
  {key:"decode", label:"🧩 根据 ABI 解码"},
  {key:"build-abi", label:"🛠 根据 ABI 构造"},
  {key:"build-custom", label:"⚙️ 自定义构造"},
];

export default function CalldataTools(){
  const [tab, setTab] = useState("guess");

  return (
    <section className="space-y-8">

      <h1 className="text-2xl font-bold">
        Calldata Tools
      </h1>

      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map(t=>(
          <button
            key={t.key}
            onClick={()=>setTab(t.key)}
            className={`pb-3 px-2 border-b-2 transition
                ${tab===t.key ? "border-blue-600 font-semibold" : "border-transparent text-gray-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      {tab === "guess" && <GuessDecode/> }
      {tab === "decode" && <DecodeABI/> }
      {tab === "build-abi" && <BuildFromABI/> }
      {tab === "build-custom" && <BuildCustom/> }

    </section>
  );
}
