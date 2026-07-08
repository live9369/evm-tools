"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  {name:"Calldata", path:"/tools/calldata"},
  {name:"ABI", path:"/tools/abi"},
  {name:"Event", path:"/tools/event"},
  {name:"Token", path:"/tools/token"},
  {name:"Onchain", path:"/tools/onchain"},
  {name:"Multiple", path:"/tools/multiple"},
  {name:"Storage", path:"/tools/storage"},
];

export default function Sidebar(){
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col shrink-0">
      <nav className="px-4 py-6">
        <div className="space-y-1">
          {tools.map(t => {
            const active = pathname?.startsWith(t.path);
            return (
              <Link
                key={t.path}
                href={t.path}
                className={`
                  block py-2.5 px-3 rounded-md text-sm
                  transition-colors duration-200
                  ${active
                    ? "bg-[var(--hover)] text-[var(--fg)] font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-[var(--hover)] hover:text-[var(--fg)]"}
                `}
              >
                {t.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  );
}
