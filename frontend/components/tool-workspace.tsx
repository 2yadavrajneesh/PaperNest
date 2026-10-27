"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2,
  ChevronRight, Download, Eye, FileImage, FileText, Info, LoaderCircle, Plus,
  RotateCcw, ShieldCheck, Sparkles, Trash2, UploadCloud, X, ZoomIn, ZoomOut, Gauge, Globe,
} from "lucide-react";
import { getTool, tools, type ToolConfig, type ToolSetting } from "@/lib/tools";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const MAX_FILE = 50 * 1024 * 1024;
const MAX_TOTAL = 100 * 1024 * 1024;
const MAX_FILES = 20;

type Preview = { filename: string; page_count: number; page_dimensions?: { page: number; width_pt: number; height_pt: number }[]; thumbnails: { page: number; data_url: string }[] };
type OrganizerThumbnail = { page: number; width_pt: number; height_pt: number; data_url: string };
type RenderEstimate = { minimum: number; maximum: number; megapixels: number; pages: number; dpi: number };
type ProcessResult = { job_id: string; filename: string; size: number; download_url: string; message: string };
type DetectedFormField = { name: string; label: string; type: string; value: string | number | boolean; options: string[]; page: number; required: boolean };
type RedactPagePreview = { page: number; page_count: number; width_pt: number; height_pt: number; pixel_width: number; pixel_height: number; data_url: string };
type RedactionBox = { id: string; page: number; x0: number; y0: number; x1: number; y1: number };
type RedactPageSize = { width_pt: number; height_pt: number };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extension(file: File) {
  return file.name.includes(".") ? `.${file.name.split(".").pop()!.toLowerCase()}` : "";
}

function allowedExtensions(tool: ToolConfig) {
  return tool.accepts.split(",").map((item) => item.trim().toLowerCase()).filter((item) => item.startsWith("."));
}

function makeDefaults(tool: ToolConfig) {
  return tool.settings.reduce<Record<string, string | number>>((result, setting) => {
    result[setting.key] = setting.defaultValue;
    return result;
  }, {});
}

function getErrorMessage(payload: any, status: number) {
  const detail = payload?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join("; ") || `Processing failed (${status}).`;
  return payload?.message || `Processing failed (${status}). Please check the file and retry.`;
}

function getRedactPreviewError(payload: any, status: number, stage: "create" | "page") {
  const detail = payload?.detail;
  // FastAPI's default 404 means the route is missing, unlike the API's explicit
  // "Redaction preview has expired" response for a missing/expired session.
  if (status === 404 && detail === "Not Found") {
    const route = stage === "create"
      ? "POST /api/redact-preview"
      : "GET /api/redact-preview/{session_id}/page/{page_number}";
    return `The redaction preview endpoint (${route}) was not found at ${API_BASE}. The API server is probably running an older PaperNest backend. Update backend/app/main.py and rebuild/restart the API. You can verify the route at ${API_BASE}/docs.`;
  }
  return getErrorMessage(payload, status);
}

export function ToolWorkspace({ slug }: { slug: string }) {
  const tool = getTool(slug);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const redactImageFrameRef = useRef<HTMLDivElement>(null);
  const redactDragStartRef = useRef<{ x: number; y: number; page: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [organizePages, setOrganizePages] = useState<OrganizerThumbnail[]>([]);
  const [organizePreviewLoading, setOrganizePreviewLoading] = useState(false);
  const [organizePreviewError, setOrganizePreviewError] = useState("");
  const [organizeDraggingPage, setOrganizeDraggingPage] = useState<number | null>(null);
  const [organizeDropTarget, setOrganizeDropTarget] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerUrl, setReaderUrl] = useState("");
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState("");
  const [formFields, setFormFields] = useState<DetectedFormField[]>([]);
  const [formFieldsLoading, setFormFieldsLoading] = useState(false);
  const [formFieldsError, setFormFieldsError] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [redactSession, setRedactSession] = useState<{ session_id: string; page_count: number } | null>(null);
  const [redactSessionLoading, setRedactSessionLoading] = useState(false);
  const [redactPage, setRedactPage] = useState<RedactPagePreview | null>(null);
  const [redactPageNumber, setRedactPageNumber] = useState(1);
  const [redactZoom, setRedactZoom] = useState(1);
  const [redactPageLoading, setRedactPageLoading] = useState(false);
  const [redactError, setRedactError] = useState("");
  const [redactBoxes, setRedactBoxes] = useState<RedactionBox[]>([]);
  const [redactPageSizes, setRedactPageSizes] = useState<Record<number, RedactPageSize>>({});
  const [redactDrawing, setRedactDrawing] = useState<{ page: number; x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    if (!tool) return;
    setSettings(makeDefaults(tool));
    // Each tool gets its own clean workspace. In particular, URL-to-PDF must
    // not inherit stale file uploads from the previously visited tool.
    setFiles([]);
    setPreview(null);
    setResult(null);
    setResultMessage("");
    setError("");
    setStage("idle");
    setUploadPercent(0);
    setReaderOpen(false);
  }, [slug]);

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/api/health`, { cache: "no-store" })
      .then((res) => { if (live) setApiAvailable(res.ok); })
      .catch(() => { if (live) setApiAvailable(false); });
    return () => { live = false; };
  }, []);

  const firstFile = files[0];
  useEffect(() => {
    if (!firstFile || extension(firstFile) !== ".pdf") {
      setReaderUrl("");
      return;
    }
    const url = URL.createObjectURL(firstFile);
    setReaderUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [firstFile]);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      const pdf = files.find((file) => extension(file) === ".pdf");
      setPreview(null);
      setPreviewMessage("");
      if (tool?.slug === "redact-pdf" || tool?.slug === "organize-pdf" || !pdf) return;
      setPreviewLoading(true);
      const body = new FormData();
      body.append("file", pdf, pdf.name);
      try {
        const response = await fetch(`${API_BASE}/api/preview`, { method: "POST", body, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, response.status));
        if (!cancelled) setPreview(payload as Preview);
      } catch (err) {
        if (!cancelled) setPreviewMessage(err instanceof Error ? err.message : "Preview is not available for this file.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    void loadPreview();
    return () => { cancelled = true; };
  }, [files, tool?.slug]);

  useEffect(() => {
    let cancelled = false;
    const pdf = files.find((file) => extension(file) === ".pdf");
    setOrganizePages([]);
    setOrganizePreviewError("");
    setOrganizeDraggingPage(null);
    setOrganizeDropTarget(null);
    if (tool?.slug !== "organize-pdf" || !pdf) {
      setOrganizePreviewLoading(false);
      return () => { cancelled = true; };
    }
    async function loadOrganizerThumbnails() {
      setOrganizePreviewLoading(true);
      const body = new FormData();
      body.append("file", pdf!, pdf!.name);
      try {
        const response = await fetch(`${API_BASE}/api/organize-preview`, { method: "POST", body, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, response.status));
        if (!cancelled) {
          const pages = Array.isArray(payload.pages) ? payload.pages as OrganizerThumbnail[] : [];
          setOrganizePages(pages);
          setSettings((current) => ({ ...current, order: "" }));
          if (!pages.length) setOrganizePreviewError("No page thumbnails were returned for this PDF.");
        }
      } catch (err) {
        if (!cancelled) setOrganizePreviewError(err instanceof Error ? err.message : "Could not create page thumbnails.");
      } finally {
        if (!cancelled) setOrganizePreviewLoading(false);
      }
    }
    void loadOrganizerThumbnails();
    return () => { cancelled = true; };
  }, [tool?.slug, firstFile]);

  useEffect(() => {
    let cancelled = false;
    const pdf = files.find((file) => extension(file) === ".pdf");
    setRedactSession(null);
    setRedactPage(null);
    setRedactPageNumber(1);
    setRedactZoom(1);
    setRedactBoxes([]);
    setRedactPageSizes({});
    setRedactDrawing(null);
    setRedactError("");
    if (tool?.slug !== "redact-pdf" || !pdf) {
      setRedactSessionLoading(false);
      return () => { cancelled = true; };
    }
    async function createSession() {
      setRedactSessionLoading(true);
      const body = new FormData();
      body.append("file", pdf!, pdf!.name);
      try {
        const response = await fetch(`${API_BASE}/api/redact-preview`, { method: "POST", body, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(getRedactPreviewError(payload, response.status, "create"));
        if (!cancelled) setRedactSession({ session_id: payload.session_id, page_count: payload.page_count });
      } catch (err) {
        if (!cancelled) setRedactError(err instanceof Error ? err.message : "Could not open the PDF for visual redaction.");
      } finally {
        if (!cancelled) setRedactSessionLoading(false);
      }
    }
    void createSession();
    return () => { cancelled = true; };
  }, [tool?.slug, firstFile]);

  useEffect(() => {
    let cancelled = false;
    async function loadRedactPage() {
      setRedactPage(null);
      if (tool?.slug !== "redact-pdf" || !redactSession) return;
      setRedactError("");
      setRedactPageLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/redact-preview/${redactSession.session_id}/page/${redactPageNumber}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(getRedactPreviewError(payload, response.status, "page"));
        if (!cancelled) {
          const pagePayload = payload as RedactPagePreview;
          setRedactPage(pagePayload);
          setRedactPageSizes((current) => ({ ...current, [pagePayload.page]: { width_pt: pagePayload.width_pt, height_pt: pagePayload.height_pt } }));
        }
      } catch (err) {
        if (!cancelled) setRedactError(err instanceof Error ? err.message : "Could not render this page.");
      } finally {
        if (!cancelled) setRedactPageLoading(false);
      }
    }
    void loadRedactPage();
    return () => { cancelled = true; };
  }, [tool?.slug, redactSession, redactPageNumber]);

  useEffect(() => {
    let cancelled = false;
    async function inspectForm() {
      setFormFields([]);
      setFormValues({});
      setFormFieldsError("");
      if (tool?.slug !== "fill-pdf-form" || !firstFile || extension(firstFile) !== ".pdf") return;
      setFormFieldsLoading(true);
      const body = new FormData();
      body.append("file", firstFile, firstFile.name);
      try {
        const response = await fetch(`${API_BASE}/api/form-fields`, { method: "POST", body, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, response.status));
        if (!cancelled) {
          const found = Array.isArray(payload.fields) ? payload.fields as DetectedFormField[] : [];
          setFormFields(found);
          if (!found.length) setFormFieldsError("No supported fillable fields were detected. This may be a scanned PDF, a flat form, or an unsupported XFA form.");
        }
      } catch (err) {
        if (!cancelled) setFormFieldsError(err instanceof Error ? err.message : "Could not inspect form fields.");
      } finally {
        if (!cancelled) setFormFieldsLoading(false);
      }
    }
    void inspectForm();
    return () => { cancelled = true; };
  }, [tool?.slug, firstFile]);

  const totalBytes = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);
  const renderEstimate = useMemo<RenderEstimate | null>(() => {
    if (!tool || !["pdf-to-jpg", "pdf-to-png"].includes(tool.slug) || !preview?.page_dimensions?.length) return null;
    const dpi = Math.max(72, Math.min(240, Number(settings.dpi || 144)));
    const totalPixels = preview.page_dimensions.reduce((sum, page) => sum + (page.width_pt / 72 * dpi) * (page.height_pt / 72 * dpi), 0);
    // Raster output varies widely with photographs, noise, font rendering and compression.
    // These deliberately broad per-pixel ranges are estimates, not hard guarantees.
    const perPixel = tool.slug === "pdf-to-jpg" ? [0.025, 0.22] : [0.04, 0.62];
    const minimum = Math.max(preview.page_count * 12 * 1024, totalPixels * perPixel[0]);
    const maximum = Math.max(preview.page_count * 80 * 1024, totalPixels * perPixel[1]);
    return { minimum, maximum, megapixels: totalPixels / 1_000_000, pages: preview.page_count, dpi };
  }, [tool, preview, settings.dpi]);
  const currentPageLimit = tool?.slug === "ocr-pdf" || tool?.slug === "pdf-to-powerpoint" ? 100 : tool?.slug === "html-to-pdf" ? 200 : 500;
  const activePageCount = preview?.page_count || (tool?.slug === "organize-pdf" ? organizePages.length : 0);
  const multipleOutputNote = tool?.slug === "split-pdf" || tool?.slug === "pdf-to-jpg" || tool?.slug === "pdf-to-png" || (files.length > 1 && tool?.slug !== "sign-pdf");

  const addFiles = useCallback((list: FileList | File[]) => {
    if (!tool) return;
    if (tool.slug === "html-to-pdf") {
      setError("This tool converts a webpage URL. Paste the URL into the field instead of uploading a file.");
      return;
    }
    setError(""); setResult(null); setResultMessage(""); setReaderOpen(false); setStage("idle"); setUploadPercent(0);
    const incoming = Array.from(list);
    const allowed = allowedExtensions(tool);
    const valid: File[] = [];
    const problems: string[] = [];
    for (const file of incoming) {
      const ext = extension(file);
      if (!allowed.includes(ext)) { problems.push(`${file.name}: unsupported file type for ${tool.title}.`); continue; }
      if (file.size > MAX_FILE) { problems.push(`${file.name}: files must be 50 MB or smaller.`); continue; }
      valid.push(file);
    }
    let merged = tool.multiple ? [...files, ...valid] : valid.slice(0, 1);
    // PDF + optional image flows expect the primary document first.
    if (["watermark-pdf", "edit-pdf", "sign-pdf"].includes(tool.slug)) {
      merged.sort((a, b) => (extension(a) === ".pdf" ? -1 : 0) - (extension(b) === ".pdf" ? -1 : 0));
    }
    const unique: File[] = [];
    const seen = new Set<string>();
    for (const file of merged) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!seen.has(key)) { unique.push(file); seen.add(key); }
    }
    if (unique.length > MAX_FILES) problems.push(`You can select up to ${MAX_FILES} files.`);
    const trimmed: File[] = [];
    let sum = 0;
    for (const file of unique.slice(0, MAX_FILES)) {
      if (sum + file.size > MAX_TOTAL) {
        problems.push("Total upload is limited to 100 MB. Some files were not added.");
        continue;
      }
      trimmed.push(file);
      sum += file.size;
    }
    setFiles(trimmed);
    if (problems.length) setError(problems.join(" "));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [tool, files]);

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setResult(null); setError(""); setReaderOpen(false); setStage("idle");
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setSetting = (key: string, value: string | number) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setResult(null); setResultMessage("");
  };

  const actionDisabled = useMemo(() => {
    if (!tool || busy) return true;
    let urlOnlyReady = false;
    if (tool.slug === "html-to-pdf" && files.length === 0) {
      try {
        const parsedUrl = new URL(String(settings.url || "").trim());
        urlOnlyReady = (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") && Boolean(parsedUrl.hostname);
      } catch {
        urlOnlyReady = false;
      }
    }
    if (!files.length && !urlOnlyReady) return true;
    if (["pdf-to-jpg", "pdf-to-png"].includes(tool.slug) && previewLoading) return true;
    if (tool.slug === "merge-pdf" && files.length < 2) return true;
    if (tool.slug === "compare-pdf" && files.length !== 2) return true;
    if (tool.slug === "redact-pdf" && (String(settings.confirmed || "no") !== "yes" || (!String(settings.terms || "").trim() && redactBoxes.length === 0) || redactSessionLoading || redactPageLoading)) return true;
    if (tool.slug === "fill-pdf-form" && (formFieldsLoading || formFields.length === 0 || Object.keys(formValues).length === 0)) return true;
    if (["remove-pages", "extract-pages"].includes(tool.slug) && !String(settings.pages || "").trim()) return true;
    if (tool.slug === "add-text" && !String(settings.text || "").trim()) return true;
    return false;
  }, [tool, files, busy, settings, formFieldsLoading, formFields.length, formValues, redactBoxes.length, redactSessionLoading, redactPageLoading, previewLoading]);

  const startProcessing = () => {
    if (!tool || actionDisabled) {
      if (tool?.slug === "merge-pdf" && files.length < 2) setError("Select at least two PDF files to merge.");
      else if (tool?.slug === "compare-pdf" && files.length !== 2) setError("Select exactly two PDF files to compare.");
      else if (["remove-pages", "extract-pages"].includes(tool?.slug || "") && !String(settings.pages || "").trim()) setError("Enter the page numbers or range to continue.");
      else if (tool?.slug === "add-text" && !String(settings.text || "").trim()) setError("Enter the text to add to the PDF.");
      else if (tool?.slug === "html-to-pdf" && !String(settings.url || "").trim() && !files.length) setError("Enter a public webpage URL beginning with https:// or http://.");
      else if (tool?.slug === "html-to-pdf" && files.length === 0) setError("Enter a valid HTTP or HTTPS webpage URL.");
      return;
    }
    if (tool.slug === "html-to-pdf") {
      try {
        const parsedUrl = new URL(String(settings.url || "").trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) throw new Error("invalid URL");
      } catch {
        setError("Enter a valid public webpage URL beginning with https:// or http://.");
        return;
      }
      if (files.length > 0) {
        setError("HTML / URL to PDF accepts a webpage URL, not an uploaded file. Remove the file and paste a URL above.");
        return;
      }
    }
    if (tool.slug === "protect-pdf") {
      if (String(settings.password || "").length < 8) { setError("Choose a password with at least 8 characters."); return; }
      if (String(settings.password || "") !== String(settings.password_confirm || "")) { setError("The password and confirmation do not match."); return; }
    }
    if (tool.slug === "unlock-pdf" && !String(settings.password || "")) { setError("Enter the current PDF password."); return; }
    if (tool.slug === "sign-pdf") {
      if (files.length !== 2 || extension(files[0]) !== ".pdf" || ![".png", ".jpg", ".jpeg"].includes(extension(files[1]))) {
        setError("Upload exactly one PDF first, then one PNG/JPG signature image."); return;
      }
    }
    if (tool.slug === "pdf-metadata" && !["title", "author", "subject", "keywords", "creator"].some((key) => String(settings[key] || "").trim())) {
      setError("Enter at least one metadata field to update."); return;
    }
    if (tool.slug === "redact-pdf") {
      if (String(settings.confirmed || "no") !== "yes") { setError("Confirm that you understand redaction is permanent."); return; }
      if (!String(settings.terms || "").trim() && redactBoxes.length === 0) { setError("Draw at least one redaction region on a page, or enter a text phrase to redact."); return; }
      if (redactBoxes.some((box) => !redactPageSizes[box.page])) { setError("A selected page region is missing its page dimensions. Revisit that page and draw the region again."); return; }
    }
    if (tool.slug === "fill-pdf-form") {
      if (!formFields.length) { setError("No supported fillable fields were detected in this PDF."); return; }
      if (!Object.keys(formValues).length) { setError("Change at least one form field before processing."); return; }
    }
    setError(""); setResult(null); setResultMessage("");
    if (tool.slug === "pdf-reader") {
      setReaderOpen(true);
      setResultMessage("The original PDF is opened from your device in the browser viewer. Server-generated preview thumbnails are temporary.");
      setStage("done");
      return;
    }
    setBusy(true); setStage("uploading"); setUploadPercent(0); setApiError("");
    const body = new FormData();
    files.forEach((file) => body.append("files", file, file.name));
    const requestOptions: Record<string, unknown> = { ...settings };
    if (tool.slug === "fill-pdf-form") requestOptions.form_values = formValues;
    if (tool.slug === "redact-pdf") {
      requestOptions.boxes_json = JSON.stringify(redactBoxes.map((box) => {
        const size = redactPageSizes[box.page];
        return { page: box.page, x0: box.x0 * size.width_pt, y0: box.y0 * size.height_pt, x1: box.x1 * size.width_pt, y1: box.y1 * size.height_pt, visual: true };
      }));
      requestOptions.pages = "";
    }
    body.append("options", JSON.stringify(requestOptions));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/process/${tool.slug}`);
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setUploadPercent(percent);
        if (percent >= 100) setStage("processing");
      }
    };
    xhr.onload = () => {
      setBusy(false);
      let payload: any = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        setResult(payload as ProcessResult);
        setResultMessage(payload.message || "Processing completed successfully.");
        setStage("done");
      } else {
        setStage("idle");
        setError(getErrorMessage(payload, xhr.status));
      }
    };
    xhr.onerror = () => {
      setBusy(false); setStage("idle");
      setError(`Could not reach the processing API at ${API_BASE}. Make sure the FastAPI backend is running and its CORS origin allows this website.`);
    };
    xhr.ontimeout = () => { setBusy(false); setStage("idle"); setError("The processing request timed out. Try fewer pages or a smaller file."); };
    xhr.timeout = 240000;
    xhr.send(body);
  };

  const moveOrganizerThumbnail = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= organizePages.length || toIndex >= organizePages.length || fromIndex === toIndex) return;
    const reordered = [...organizePages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setOrganizePages(reordered);
    setSettings((current) => ({ ...current, order: reordered.map((item) => item.page).join(",") }));
    setResult(null);
    setResultMessage("");
    setOrganizeDropTarget(null);
  };

  const resetWorkspace = () => {
    setFiles([]); setPreview(null); setPreviewMessage(""); setResult(null); setResultMessage(""); setError(""); setBusy(false); setStage("idle"); setUploadPercent(0); setReaderOpen(false); setSettings(makeDefaults(tool!)); setFormFields([]); setFormValues({}); setFormFieldsError(""); setOrganizePages([]); setOrganizePreviewError(""); setOrganizeDraggingPage(null); setOrganizeDropTarget(null); setRedactSession(null); setRedactPage(null); setRedactBoxes([]); setRedactPageSizes({}); setRedactError(""); setRedactDrawing(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!tool) {
    return <main className="tool-page"><div className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="text-3xl font-bold">Tool not found</h1><p className="mt-3 text-sm text-slate-500">This PaperNest tool does not exist.</p><Link href="/" className="primary-cta mt-6">Back to all tools <ArrowRight size={16} /></Link></div></main>;
  }
  const ToolIcon = tool.icon;
  const canReorder = files.length > 1 && ["merge-pdf", "jpg-to-pdf", "png-to-pdf"].includes(tool.slug);
  const onlyTwo = tool.slug === "compare-pdf";

  return (
    <main className="tool-page">
      <section className="tool-page-hero">
        <div className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 md:py-9">
          <div className="breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><Link href={`/#${tool.category.toLowerCase().replaceAll(" ", "-")}`}>{tool.category}</Link><ChevronRight size={13} /><span>{tool.title}</span></div>
          <div className="tool-page-heading">
            <div className={`tool-page-icon tool-icon-${tool.accent}`}><ToolIcon size={25} /></div>
            <div><h1 className="tool-page-title">{tool.title}</h1><p className="tool-page-description">{tool.description}</p><div className="security-note"><ShieldCheck size={14} /> Files are processed temporarily and deleted automatically after 30 minutes.</div></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="workspace-layout">
          <div className="workspace-main">
            <section className="workspace-card" onDragEnter={(event) => { event.preventDefault(); if (tool.slug !== "html-to-pdf") setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files?.length && tool.slug !== "html-to-pdf") addFiles(event.dataTransfer.files); }}>
              <div className="workspace-card-head"><div><h2>{tool.slug === "html-to-pdf" ? "Enter a webpage URL" : files.length ? "Your files" : "Start by uploading files"}</h2><p>{tool.slug === "html-to-pdf" ? "Paste the public website address you want to save as a PDF." : files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected · ${formatBytes(totalBytes)} total` : `Supported formats: ${tool.formats}`}</p></div><span className="step-label"><i>1</i> {tool.slug === "html-to-pdf" ? "Website" : "Upload"}</span></div>
              {tool.slug !== "html-to-pdf" && <input ref={fileInputRef} type="file" accept={tool.accepts} multiple={tool.multiple} className="sr-only" onChange={(event) => { if (event.target.files?.length) addFiles(event.target.files); }} aria-label={`Select files for ${tool.title}`} />}
              {tool.slug === "html-to-pdf" ? (
                <div className="url-to-pdf-entry">
                  <label htmlFor="webpage-url">Webpage URL</label>
                  <div className="url-to-pdf-row">
                    <Globe size={19} aria-hidden="true" />
                    <input id="webpage-url" name="url" type="url" inputMode="url" autoComplete="url" spellCheck={false} value={String(settings.url || "")} onChange={(event) => setSetting("url", event.target.value)} placeholder="https://example.com" aria-describedby="webpage-url-help" />
                    {String(settings.url || "").trim() && <button type="button" className="icon-button" aria-label="Clear URL" title="Clear URL" onClick={() => setSetting("url", "")}><X size={16} /></button>}
                  </div>
                  <p id="webpage-url-help">Enter a complete address starting with https:// or http://. Private/local network URLs are blocked for safety.</p>
                </div>
              ) : !files.length ? (
                <div className={`dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}>
                  <div className="dropzone-icon"><UploadCloud size={25} /></div><h3>Drop your {tool.formats} here</h3><p>{tool.slug === "sign-pdf" ? "Add the PDF first, then the signature image." : tool.slug === "redact-pdf" ? "Choose a PDF, then drag your mouse over anything you want permanently removed." : tool.slug === "fill-pdf-form" ? "Upload a fillable PDF; the form fields will be detected automatically." : "or select files from your device"}</p><span className="dropzone-button">Choose files</span><span className="dropzone-footnote">Up to 50 MB per file · 100 MB per job</span>
                </div>
              ) : (
                <div className="file-list">
                  {files.map((file, index) => {
                    const isImage = file.type.startsWith("image/") || [".jpg", ".jpeg", ".png"].includes(extension(file));
                    return <div className="file-row" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                      <div className={`file-row-icon ${isImage ? "!text-amber-600 !bg-amber-50" : ""}`}>{isImage ? <FileImage size={20} /> : <FileText size={20} />}</div>
                      <div className="file-row-info"><strong title={file.name}>{file.name}</strong><span>{formatBytes(file.size)}{preview && file.name === preview.filename ? ` · ${preview.page_count} pages` : ` · ${extension(file).replace(".", "").toUpperCase()}`}</span></div>
                      <div className="file-row-actions">
                        {canReorder && <><button className="icon-button" type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} aria-label={`Move ${file.name} up`} title="Move earlier"><ArrowUp size={15} /></button><button className="icon-button" type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} aria-label={`Move ${file.name} down`} title="Move later"><ArrowDown size={15} /></button></>}
                        <button className="icon-button" type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} title="Remove file"><X size={16} /></button>
                      </div>
                    </div>;
                  })}
                  <button className="inline-add" type="button" onClick={() => fileInputRef.current?.click()}><Plus size={15} /> Add more files</button>
                  {totalBytes > MAX_TOTAL && <div className="processing-state error"><AlertCircle size={16} /> Total upload exceeds 100 MB. Remove a file before continuing.</div>}
                  {onlyTwo && <p className="setting-help">Comparison requires exactly two PDFs. Upload two versions of the document.</p>}
                  {tool.slug === "merge-pdf" && <p className="setting-help">Files are merged in the order shown above. Use the arrows to reorder them.</p>}
                </div>
              )}
              {error && <div className="processing-state error"><AlertCircle size={16} /><span>{error}</span></div>}
              {busy && <div className="processing-state"><LoaderCircle size={17} className="animate-spin" /><span>{stage === "uploading" ? `Uploading files… ${uploadPercent}%` : "Files uploaded. Processing with the document engine… This can take a moment for large files."}</span></div>}
              {stage === "done" && !result && tool.slug === "pdf-reader" && readerOpen && <div className="processing-state success"><CheckCircle2 size={17} /><span>Reader ready. The browser is displaying the local document; no output file was created.</span></div>}
              {result && (
                <div className="result-card">
                  <div className="result-heading"><div className="result-check"><Check size={18} /></div><div><b>Your file is ready</b><span>{result.filename} · {formatBytes(result.size)}</span></div></div>
                  <p className="result-message">{resultMessage}</p>
                  <a className="download-button" href={`${API_BASE}${result.download_url}`}><Download size={16} /> Download result</a>
                  <button className="reset-button" type="button" onClick={resetWorkspace}><RotateCcw size={13} /> Start another task</button>
                </div>
              )}
              {readerOpen && tool.slug === "pdf-reader" && readerUrl && <div className="full-reader"><div className="full-reader-head"><b>{firstFile?.name}</b><span>{preview?.page_count ?? "PDF"} page(s)</span></div><iframe src={readerUrl} title={`PDF reader: ${firstFile?.name}`} /></div>}
              {tool.slug === "redact-pdf" && files.length > 0 && <section className="redact-selector">
                <div className="redact-selector-header">
                  <div><h3>Mark content to redact</h3><p>Drag over text, a name, account number, or any area on the page. Your selection is shown in red.</p></div>
                  {redactSession && <span className="redact-page-count">{redactSession.page_count} pages</span>}
                </div>
                {(redactSessionLoading || redactPageLoading) && <div className="redact-loading"><LoaderCircle size={15} className="animate-spin" /> {redactSessionLoading ? "Preparing secure preview…" : `Rendering page ${redactPageNumber}…`}</div>}
                {redactError && <div className="processing-state error"><AlertCircle size={15} /><span>{redactError}</span></div>}
                {redactSession && redactPage && <>
                  <div className="redact-page-toolbar">
                    <button type="button" className="redact-nav-button" disabled={redactPageNumber <= 1 || redactPageLoading} onClick={() => setRedactPageNumber((page) => Math.max(1, page - 1))}><ArrowLeft size={14} /> Previous</button>
                    <span className="redact-page-counter">Page <b>{redactPageNumber}</b> of {redactSession.page_count}</span>
                    <div className="redact-zoom-controls" aria-label="PDF zoom controls">
                      <button type="button" className="redact-zoom-button" aria-label="Zoom out" title="Zoom out" disabled={redactZoom <= 0.5} onClick={() => setRedactZoom((zoom) => Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100))}><ZoomOut size={15} /></button>
                      <span className="redact-zoom-value">{Math.round(redactZoom * 100)}%</span>
                      <button type="button" className="redact-zoom-button" aria-label="Zoom in" title="Zoom in" disabled={redactZoom >= 4} onClick={() => setRedactZoom((zoom) => Math.min(4, Math.round((zoom + 0.25) * 100) / 100))}><ZoomIn size={15} /></button>
                      <button type="button" className="redact-fit-button" onClick={() => setRedactZoom(1)} disabled={redactZoom === 1}>Fit</button>
                    </div>
                    <button type="button" className="redact-nav-button" disabled={redactPageNumber >= redactSession.page_count || redactPageLoading} onClick={() => setRedactPageNumber((page) => Math.min(redactSession.page_count, page + 1))}>Next <ArrowRight size={14} /></button>
                  </div>
                  <div className="redact-canvas-wrap">
                    <div ref={redactImageFrameRef} className="redact-image-frame" style={{ aspectRatio: `${redactPage.pixel_width} / ${redactPage.pixel_height}`, width: `${redactZoom * 100}%`, maxWidth: redactZoom <= 1 ? "1100px" : "none" }}
                      onPointerDown={(event) => {
                        if (event.button !== 0 || redactPageLoading) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
                        redactDragStartRef.current = { x, y, page: redactPageNumber };
                        setRedactDrawing({ page: redactPageNumber, x0: x, y0: y, x1: x, y1: y });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        const start = redactDragStartRef.current;
                        if (!start || start.page !== redactPageNumber) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
                        setRedactDrawing({ page: start.page, x0: Math.min(start.x, x), y0: Math.min(start.y, y), x1: Math.max(start.x, x), y1: Math.max(start.y, y) });
                      }}
                      onPointerUp={(event) => {
                        const start = redactDragStartRef.current;
                        if (!start) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
                        const box = { page: start.page, x0: Math.min(start.x, x), y0: Math.min(start.y, y), x1: Math.max(start.x, x), y1: Math.max(start.y, y) };
                        if (box.x1 - box.x0 > 0.004 && box.y1 - box.y0 > 0.004) setRedactBoxes((current) => [...current, { ...box, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
                        redactDragStartRef.current = null;
                        setRedactDrawing(null);
                      }}
                      onPointerCancel={() => { redactDragStartRef.current = null; setRedactDrawing(null); }}
                    >
                      <img src={redactPage.data_url} alt={`PDF page ${redactPageNumber}; drag over content to mark it for redaction`} draggable={false} />
                      {redactBoxes.filter((box) => box.page === redactPageNumber).map((box) => <div key={box.id} className="redact-region" style={{ left: `${box.x0 * 100}%`, top: `${box.y0 * 100}%`, width: `${(box.x1 - box.x0) * 100}%`, height: `${(box.y1 - box.y0) * 100}%` }}><span>{redactBoxes.findIndex((item) => item.id === box.id) + 1}</span></div>)}
                      {redactDrawing?.page === redactPageNumber && <div className="redact-region redact-region-drawing" style={{ left: `${redactDrawing.x0 * 100}%`, top: `${redactDrawing.y0 * 100}%`, width: `${(redactDrawing.x1 - redactDrawing.x0) * 100}%`, height: `${(redactDrawing.y1 - redactDrawing.y0) * 100}%` }} />}
                    </div>
                  </div>
                  <div className="redact-selection-footer"><span>{redactBoxes.length} region{redactBoxes.length === 1 ? "" : "s"} selected across {new Set(redactBoxes.map((box) => box.page)).size} page(s)</span>{redactBoxes.length > 0 && <button type="button" onClick={() => setRedactBoxes((current) => current.filter((box) => box.page !== redactPageNumber))}>Clear page selections</button>}</div>
                  {redactBoxes.length > 0 && <div className="redact-region-list">{redactBoxes.map((box, index) => <div key={box.id} className="redact-region-item"><span className="redact-region-dot" /><span>Region {index + 1} · Page {box.page}</span><button type="button" title={`Remove region ${index + 1}`} aria-label={`Remove region ${index + 1}`} onClick={() => setRedactBoxes((current) => current.filter((item) => item.id !== box.id))}><X size={14} /></button></div>)}</div>}
                  <p className="redact-disclaimer">Drag to mark exact areas. Redaction is permanent, so review the selected regions and downloaded PDF carefully before sharing.</p>
                </>}
              </section>}
              {files.length > 0 && tool.slug === "organize-pdf" && <section className="organize-board">
                <div className="organize-board-heading"><div><h3>Reorder pages</h3><p>Drag a thumbnail onto another page to change the order. The numbering badge shows its new position.</p></div>{organizePages.length > 0 && <span className="page-count-pill">{organizePages.length} pages</span>}</div>
                {organizePreviewLoading && <p className="setting-help flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Loading all page thumbnails…</p>}
                {organizePreviewError && !organizePreviewLoading && <div className="processing-state error"><AlertCircle size={15} />{organizePreviewError}</div>}
                {!organizePreviewLoading && organizePages.length > 0 && <>
                  <p className="organize-order-note">Current order: {organizePages.map((page) => page.page).join(", ")}</p>
                  <div className="organize-thumbnail-grid" role="list" aria-label="Reorder PDF page thumbnails">
                    {organizePages.map((thumb, index) => <figure key={thumb.page} role="listitem" tabIndex={0} draggable className={`organize-thumbnail ${organizeDraggingPage === thumb.page ? "is-dragging" : ""} ${organizeDropTarget === thumb.page ? "is-drop-target" : ""}`} aria-label={`Original page ${thumb.page}, new position ${index + 1}. Drag to reorder.`}
                      onDragStart={(event) => { setOrganizeDraggingPage(thumb.page); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(thumb.page)); }}
                      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOrganizeDropTarget(thumb.page); }}
                      onDragLeave={() => setOrganizeDropTarget((current) => current === thumb.page ? null : current)}
                      onDrop={(event) => { event.preventDefault(); const sourcePage = Number(event.dataTransfer.getData("text/plain") || organizeDraggingPage); const fromIndex = organizePages.findIndex((item) => item.page === sourcePage); moveOrganizerThumbnail(fromIndex, index); setOrganizeDraggingPage(null); setOrganizeDropTarget(null); }}
                      onDragEnd={() => { setOrganizeDraggingPage(null); setOrganizeDropTarget(null); }}
                      onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); moveOrganizerThumbnail(index, index - 1); } if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); moveOrganizerThumbnail(index, index + 1); } }}>
                      <div className="organize-thumbnail-image"><img src={thumb.data_url} alt={`Page thumbnail originally numbered ${thumb.page}`} draggable={false} /><span className="organize-position-badge">{index + 1}</span><span className="organize-drag-handle" aria-hidden="true">⠿</span></div>
                      <figcaption><span>Page {thumb.page}</span><span className="organize-thumb-actions"><button type="button" title="Move earlier" aria-label={`Move page ${thumb.page} earlier`} disabled={index === 0} onClick={() => moveOrganizerThumbnail(index, index - 1)}><ArrowUp size={12} /></button><button type="button" title="Move later" aria-label={`Move page ${thumb.page} later`} disabled={index === organizePages.length - 1} onClick={() => moveOrganizerThumbnail(index, index + 1)}><ArrowDown size={12} /></button></span></figcaption>
                    </figure>)}
                  </div>
                  <p className="setting-help mt-3">Dragging thumbnails automatically fills the page-order setting. Page deletions and rotations still refer to the original page numbers.</p>
                </>}
              </section>}
              {files.length > 0 && preview && tool.slug !== "redact-pdf" && tool.slug !== "organize-pdf" && (
                <div className="preview-area">
                  <h3><Eye size={15} /> Page preview <span className="page-count-pill">{preview.page_count} pages</span></h3>
                  <div className="preview-grid">
                    {preview.thumbnails.map((thumb) => (
                      <figure className="preview-thumb" key={thumb.page}>
                        <img src={thumb.data_url} alt={`Preview of PDF page ${thumb.page}`} />
                        <figcaption>Page {thumb.page}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {preview.page_count > preview.thumbnails.length && (
                    <p className="setting-help mt-3">Showing {preview.thumbnails.length} sample pages for a quick preview. The original document remains unchanged until you process it.</p>
                  )}
                </div>
              )}
              {files.length > 0 && previewLoading && tool.slug !== "redact-pdf" && tool.slug !== "organize-pdf" && <div className="preview-area"><p className="setting-help flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Creating temporary page thumbnails…</p></div>}
              {files.length > 0 && previewMessage && !preview && tool.slug !== "redact-pdf" && tool.slug !== "organize-pdf" && <div className="preview-area"><p className="setting-help flex items-start gap-2"><Info size={14} className="mt-0.5 shrink-0" /> {previewMessage}</p></div>}
              {files.length > 0 && activePageCount > 0 && tool.slug !== "redact-pdf" && <section className="estimate-card">
                <div className="estimate-card-heading"><Gauge size={17} /><div><h3>File size &amp; page-limit estimate</h3><p>Approximation before processing; actual output varies by document.</p></div></div>
                <div className="estimate-metrics"><div><span>Input file</span><strong>{formatBytes(firstFile?.size || 0)}</strong></div><div><span>PDF pages</span><strong>{activePageCount.toLocaleString()}</strong></div><div><span>Page limit for this tool</span><strong>{currentPageLimit} pages</strong></div></div>
                {renderEstimate && <div className="estimate-output"><span>Estimated {tool.slug === "pdf-to-jpg" ? "JPG" : "PNG"} output at {renderEstimate.dpi} DPI</span><strong>{formatBytes(renderEstimate.minimum)} – {formatBytes(renderEstimate.maximum)}</strong><small>About {renderEstimate.megapixels.toLocaleString(undefined, { maximumFractionDigits: 1 })} megapixels across {renderEstimate.pages} page(s). This range is approximate, not a guarantee.{files.length > 1 ? " Estimate uses the first PDF only; each output can differ." : ""}</small></div>}
                <div className={`estimate-limits ${activePageCount > currentPageLimit || (renderEstimate && renderEstimate.maximum > 250 * 1024 * 1024) ? "is-warning" : ""}`}>
                  <span>Limits: 50 MB per file · 100 MB per job · 250 MB generated output · 500 pages per PDF.</span>
                  {(tool.slug === "ocr-pdf" || tool.slug === "pdf-to-powerpoint") && <span>This tool also has a stricter limit of {currentPageLimit} pages per file.</span>}
                  {activePageCount > currentPageLimit && <strong>This PDF exceeds the current tool's page limit; processing will be rejected. Split the PDF or select fewer pages first.</strong>}
                  {renderEstimate && renderEstimate.maximum > 250 * 1024 * 1024 && <strong>The estimated upper range exceeds the 250 MB output limit. Reduce DPI or split the PDF into smaller batches.</strong>}
                </div>
              </section>}
            </section>
            {tool.limitations && <div className="limitation-note"><Info size={15} /><span>{tool.limitations}</span></div>}
            <div className="helper-card"><h3><ShieldCheck size={15} /> How your files are handled</h3><p>The backend validates file extensions and signatures, checks upload limits, and keeps output files in a random job folder. Downloads expire when temporary files are cleaned up. Avoid uploading documents you are not authorized to process.</p></div>
          </div>

          <aside className="workspace-side">
            <section className="settings-card">
              <div className="workspace-card-head"><div><h2>Tool settings</h2><p>Set the options for your output</p></div><span className="step-label"><i>2</i> Configure</span></div>
              {tool.settings.length ? <div className="settings-body">
                {tool.settings.map((setting: ToolSetting) => <div className="setting-field" key={setting.key}><label htmlFor={`setting-${setting.key}`}>{setting.label}</label>
                  {setting.kind === "select" ? <select id={`setting-${setting.key}`} value={String(settings[setting.key] ?? setting.defaultValue)} onChange={(event) => setSetting(setting.key, event.target.value)}>{(setting.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    : setting.kind === "color" ? <input id={`setting-${setting.key}`} type="color" value={String(settings[setting.key] ?? setting.defaultValue)} onChange={(event) => setSetting(setting.key, event.target.value)} />
                    : setting.kind === "password" ? <input id={`setting-${setting.key}`} type="password" autoComplete="new-password" value={String(settings[setting.key] ?? setting.defaultValue)} placeholder={setting.placeholder} onChange={(event) => setSetting(setting.key, event.target.value)} />
                    : setting.kind === "number" ? <input id={`setting-${setting.key}`} type="number" min={setting.min} max={setting.max} step={setting.step ?? 1} value={Number(settings[setting.key] ?? setting.defaultValue)} onChange={(event) => setSetting(setting.key, event.target.value === "" ? "" : Number(event.target.value))} />
                    : setting.kind === "textarea" ? <textarea id={`setting-${setting.key}`} value={String(settings[setting.key] ?? setting.defaultValue)} placeholder={setting.placeholder} onChange={(event) => setSetting(setting.key, event.target.value)} />
                    : <input id={`setting-${setting.key}`} type="text" value={String(settings[setting.key] ?? setting.defaultValue)} placeholder={setting.placeholder} onChange={(event) => setSetting(setting.key, event.target.value)} />}
                  {setting.help && <p className="setting-help">{setting.help}</p>}
                </div>)}
                {tool.slug === "fill-pdf-form" && <div className="form-fields-panel">
                  <div className="settings-divider" />
                  <div className="flex items-center justify-between gap-2"><h3>Detected form fields</h3>{formFields.length > 0 && <span className="page-count-pill">{formFields.length} fields</span>}</div>
                  {formFieldsLoading && <p className="setting-help flex items-center gap-2"><LoaderCircle size={13} className="animate-spin" /> Inspecting this PDF for fillable fields…</p>}
                  {formFieldsError && !formFieldsLoading && <p className="setting-help text-rose-600">{formFieldsError}</p>}
                  {formFields.map((field) => {
                    const id = `form-value-${field.name}`;
                    const current = formValues[field.name];
                    const displayed = current === undefined ? String(field.value ?? "") : typeof current === "boolean" ? String(current) : current;
                    const supportedChoices = field.options || [];
                    return <div className="setting-field" key={field.name}>
                      <label htmlFor={id}>{field.label || field.name}{field.required ? " *" : ""}<span className="ml-1 font-normal text-slate-500">({field.type}, page {field.page})</span></label>
                      {field.type === "CheckBox" ? <label className="flex items-center gap-2 !font-normal"><input id={id} type="checkbox" className="!h-4 !w-4 !p-0" checked={current === undefined ? !["Off", "", "false", "0"].includes(String(field.value)) : Boolean(current)} onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.checked }))} /><span>Checked</span></label>
                        : ((field.type === "ComboBox" || field.type === "ListBox" || field.type === "RadioButton") && supportedChoices.length > 0) ? <select id={id} value={displayed} onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}><option value="">— Select a value —</option>{supportedChoices.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                        : <input id={id} type="text" value={displayed} placeholder={`Enter ${field.label || field.name}`} onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))} />}
                    </div>;
                  })}
                  {formFields.length > 0 && <p className="setting-help">Only changed fields are submitted. Required markers come from PDF field flags; some forms may have unsupported validation logic.</p>}
                </div>}
              </div> : <div className="settings-body"><h3>Ready when you are</h3><p>This tool has no additional settings. Upload the supported file type to continue.</p><div className="settings-divider" /><div className="mini-points"><span><CheckCircle2 size={13} /> Validates uploaded file types</span><span><CheckCircle2 size={13} /> Uses the real processing engine</span><span><CheckCircle2 size={13} /> Gives you a downloadable output</span></div></div>}
              <div className="px-0 pb-1">
                <div className="px-5 pb-3 pt-1"><span className="step-label"><i>3</i> Process and download</span></div>
                <button className="process-button" type="button" onClick={startProcessing} disabled={actionDisabled || (tool.slug === "compare-pdf" && files.length !== 2)}>{busy ? <><LoaderCircle size={16} className="animate-spin" /> Processing…</> : tool.slug === "pdf-reader" ? <><Eye size={16} /> {tool.button}</> : <><Sparkles size={15} /> {tool.button} <ArrowRight size={15} /></>}</button>
              </div>
              {multipleOutputNote && <p className="px-5 pb-4 text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">Multiple outputs are bundled into a ZIP archive where applicable. Download links expire after 30 minutes.</p>}
            </section>
            <div className="tool-sidebar-info"><h3>Good to know</h3><p>{tool.slug === "pdf-to-word" ? "PDF conversion quality depends on selectable text and layout complexity." : tool.slug === "compress-pdf" ? "PDFs with already-compressed images may not become much smaller." : tool.slug === "pdf-to-excel" ? "A spreadsheet is created only when the engine detects table structures." : "PaperNest does not require an account. Keep an original copy of important documents."}</p><div className="mini-points"><span><CheckCircle2 size={13} /> No account required</span><span><CheckCircle2 size={13} /> Temporary downloads</span><span><CheckCircle2 size={13} /> File-size limits protect the service</span></div></div>
            {apiAvailable === false && <div className="tool-sidebar-info"><h3 className="!text-rose-600">Processing API unavailable</h3><p>The website could not reach <code>{API_BASE}</code>. Start the FastAPI service and verify the configured CORS origin before processing files.</p></div>}
          </aside>
        </div>
      </div>
      <footer className="tool-footer"><div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between"><Link href="/" className="footer-link inline-flex items-center gap-2"><ArrowLeft size={13} /> Back to all tools</Link><p className="text-[10px] text-slate-500">PaperNest · Temporary processing · HTTPS recommended in production</p><Link href="/#privacy" className="footer-link">Privacy and retention</Link></div></footer>
    </main>
  );
}
