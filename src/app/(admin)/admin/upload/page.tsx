"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2 } from "lucide-react";

const RESOURCE_TYPES = [
  { value: "NOTES", label: "Notes" },
  { value: "VIDEO", label: "Video" },
  { value: "PDF", label: "PDF" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PRACTICE_SET", label: "Practice Set" },
  { value: "RECORDED_LECTURE", label: "Recorded Lecture" },
  { value: "EXTERNAL_LINK", label: "External Link" },
];

export default function UploadPage() {
  const [chapters, setChapters] = useState<{ value: string; label: string }[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [chapter, setChapter] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("NOTES");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<{ title: string; type: string; topic: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/concepts?groupBy=chapter")
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []));
  }, []);

  useEffect(() => {
    if (!chapter) return;
    fetch(`/api/concepts?chapter=${encodeURIComponent(chapter)}`)
      .then((r) => r.json())
      .then((d) =>
        setTopics((d.concepts ?? []).map((c: { conceptId: string; topic: string }) => ({
          value: c.conceptId,
          label: c.topic,
        })))
      );
  }, [chapter]);

  async function handleUpload() {
    if (!title || !conceptId || (!file && type !== "EXTERNAL_LINK")) return;
    setUploading(true);

    const form = new FormData();
    form.append("title", title);
    form.append("type", type);
    form.append("conceptId", conceptId);
    if (file) form.append("file", file);

    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setUploads((prev) => [{ title, type, topic: topics.find((t) => t.value === conceptId)?.label ?? "" }, ...prev]);
      setTitle(""); setFile(null); setConceptId("");
    } else {
      alert(data.error ?? "Upload failed");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Upload Materials</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Attach notes, videos, and practice sets to topics.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Aldol Reaction — Class Notes"
          />

          <Select
            label="Type"
            options={RESOURCE_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />

          <Select
            label="Chapter"
            options={chapters}
            placeholder="Select chapter"
            value={chapter}
            onChange={(e) => { setChapter(e.target.value); setConceptId(""); }}
          />

          <Select
            label="Topic"
            options={topics}
            placeholder="Select topic"
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            disabled={!chapter}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            className={`border-2 border-dashed rounded-[6px] p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[var(--accent)] bg-[#e8f4fd]"
                : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload size={20} className="mx-auto mb-2 text-[var(--text-muted)]" />
            {file ? (
              <p className="text-[13px] text-[var(--text)]">{file.name}</p>
            ) : (
              <p className="text-[13px] text-[var(--text-muted)]">
                Drop file here or click to browse
              </p>
            )}
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button onClick={handleUpload} loading={uploading} disabled={!title || !conceptId}>
            Upload
          </Button>
        </div>
      </Card>

      {/* Recent uploads */}
      {uploads.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Recent Uploads
          </h2>
          <div className="flex flex-col gap-2">
            {uploads.map((u, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-[6px] px-4 py-2.5"
              >
                <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" />
                <span className="text-[13px] font-medium text-[var(--text)] flex-1">{u.title}</span>
                <span className="text-[12px] text-[var(--text-muted)]">{u.topic}</span>
                <Badge variant="muted">{u.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
