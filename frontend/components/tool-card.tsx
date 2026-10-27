import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ToolConfig } from "@/lib/tools";

export function ToolCard({ tool }: { tool: ToolConfig }) {
  const Icon = tool.icon;
  return (
    <Link href={`/tools/${tool.slug}`} className="tool-card group">
      <div className={`tool-icon tool-icon-${tool.accent}`}><Icon size={22} strokeWidth={1.9} /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="tool-card-title">{tool.title}</h3>
          <ArrowUpRight size={15} className="tool-card-arrow" />
        </div>
        <p className="tool-card-desc">{tool.short}</p>
      </div>
    </Link>
  );
}
