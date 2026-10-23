import type { Metadata } from "next";
import { CommandPalette } from "@/components/shell/command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export const metadata: Metadata = {
  robots: { index: false }, // the app is a working demo, not content to index
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-6 outline-none sm:px-8 sm:pt-8">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
