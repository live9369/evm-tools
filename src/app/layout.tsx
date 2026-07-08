import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata = {
  title: "EVM Tools",
  description: "EVM Tooling Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* 整体是一个上下结构：TopBar 在上，底下是 Sidebar + 内容 */}
          <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)]">
            {/* 顶部栏 */}
            <TopBar />

            {/* 底部：左侧 Sidebar + 右侧内容 */}
            <div className="flex flex-1">
              <Sidebar />

              <main className="flex-1 overflow-y-auto px-14 py-14">
                {/* 控制正文宽度，避免文字太满，很学术论文的排版 */}
                <div className="max-w-[70ch] mx-auto space-y-12">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
