"use client";

import { useState } from "react";
import { RpcChecker } from "./components/RpcChecker";
import { EventListener } from "./components/EventListener";
import { eventDefaults } from "@/app/config/defaults/event";

export default function EventTools(){
    const [rpcUrl, setRpcUrl] = useState(eventDefaults.rpc || "");

    return (
        <section className="space-y-8">
            <h1 className="text-2xl font-bold">
                Event Tools
            </h1>

            {/* RPC 检测组件 */}
            <RpcChecker onRpcUrlChange={setRpcUrl} defaultRpcUrl={eventDefaults.rpc} />

            {/* Event 监听功能 */}
            <EventListener rpcUrl={rpcUrl} defaultAbi={eventDefaults.abi} defaultAddress={eventDefaults.address} />
        </section>
    );
}

