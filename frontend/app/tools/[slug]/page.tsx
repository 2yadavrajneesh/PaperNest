import { ToolWorkspace } from "@/components/tool-workspace";
import { getTool, tools } from "@/lib/tools";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  return { title: tool ? `${tool.title} — PaperNest` : "PDF tool not found — PaperNest", description: tool?.description || "PaperNest PDF processing tool." };
}

export async function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  return <ToolWorkspace slug={slug} />;
}
