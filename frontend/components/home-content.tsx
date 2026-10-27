"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileCheck2, Search } from "lucide-react";
import { categories, tools, type ToolCategory } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";

export function HomeContent() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return tools;
    return tools.filter((tool) => `${tool.title} ${tool.short} ${tool.description} ${tool.category}`.toLowerCase().includes(clean));
  }, [query]);

  return (
    <main>
      <section id="tools" className="tools-section scroll-mt-24">
        <div className="mx-auto max-w-[1240px] px-5 pt-6 pb-12 sm:px-8 md:pt-8 md:pb-16">
          <div className="section-head-row">
            <div><span className="section-kicker">THE TOOLKIT</span><h2 className="section-title">What do you need to do?</h2><p className="section-subtitle">Everything you need to manage documents, thoughtfully organized.</p></div>
            <div className="tool-search-wrap"><Search size={18} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search PDF tools..." aria-label="Search PDF tools" /><kbd>⌘ K</kbd></div>
          </div>

          {query.trim() ? (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between"><p className="text-sm text-ink-600 dark:text-slate-400">{filtered.length} {filtered.length === 1 ? "tool" : "tools"} found</p><button className="subtle-button" onClick={() => setQuery("")}>Clear search</button></div>
              {filtered.length ? <div className="tool-grid">{filtered.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div> : <div className="empty-search"><Search size={24} /><b>No tools found</b><span>Try a different search term.</span></div>}
            </div>
          ) : (
            <div className="category-list">
              {categories.map((category: ToolCategory) => {
                const categoryTools = tools.filter((tool) => tool.category === category);
                const id = category.toLowerCase().replaceAll(" ", "-");
                return <section key={category} id={id} className="tool-category scroll-mt-28">
                  <div className="category-heading"><div><h3>{category}</h3><span>{categoryTools.length} tools</span></div></div>
                  <div className="tool-grid">{categoryTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
                </section>;
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="site-footer"><div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between"><Link href="/" className="brand-lockup"><span className="brand-mark small"><FileCheck2 size={17} /></span><span className="brand-name">paper<span>nest</span></span></Link><p>Built for practical PDF workflows. Your files are yours.</p><div className="flex gap-4"><Link href="/tools/merge-pdf">Merge PDF</Link><Link href="/tools/compress-pdf">Compress PDF</Link><Link href="/tools/ocr-pdf">OCR PDF</Link></div></div></footer>
    </main>
  );
}
