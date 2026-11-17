"use client";

import { use, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Trash2, Upload } from "lucide-react";
import { Button, Empty, ErrorBox, Field, Input, LoadingBlock, Notice, SectionTitle, Textarea } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

interface Doc {
  id: string;
  title: string;
  sizeBytes: number;
  createdAt: string;
}

const ACCEPT = ".txt,.md,.markdown,.csv,.json";

export default function KnowledgePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const docs = useQuery({ queryKey: ["knowledge", orgId], queryFn: () => api<{ documents: Doc[] }>(`/orgs/${orgId}/knowledge`) });
  const upload = useMutation({
    mutationFn: (body: { title: string; content: string }) => api(`/orgs/${orgId}/knowledge`, { body }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["knowledge", orgId] });
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api(`/orgs/${orgId}/knowledge/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge", orgId] }) });

  const onFile = async (f: File) => {
    setFileError(null);
    if (f.size > 500_000) return setFileError("Files up to 500 KB are supported.");
    if (!/\.(txt|md|markdown|csv|json)$/i.test(f.name)) return setFileError("Text, Markdown, CSV and JSON files are supported. PDF extraction is planned.");
    upload.mutate({ title: f.name, content: await f.text() });
  };

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Knowledge base" title="Business memory" body="Policies, brand guides and specifications your agents can search. Documents are private to this organization and treated as reference material, never as instructions." />
      <Notice tone="info">Search currently uses keyword matching within your organization. Vector search (pgvector) and PDF extraction are planned.</Notice>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Glass className="space-y-4 p-5">
          <p className="font-display font-semibold">Add a document</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            data-ripple
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center transition hover:border-lime/50 hover:bg-lime/[0.03]"
          >
            <Upload className="h-5 w-5 text-lime" />
            <p className="mt-2 text-sm">Drop a file or click to upload</p>
            <p className="text-xs text-dim">.txt, .md, .csv, .json · up to 500 KB</p>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          {fileError && <ErrorBox error={fileError} />}
          <div className="relative text-center text-xs text-dim">
            <span className="bg-transparent px-2">or paste text</span>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              upload.mutate({ title, content });
            }}
          >
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Brand guidelines" />
            </Field>
            <Field label="Content">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} required className="min-h-40" />
            </Field>
            {upload.error && <ErrorBox error={upload.error} />}
            <Button type="submit" loading={upload.isPending} disabled={!title || !content}>
              Save document
            </Button>
          </form>
        </Glass>
        <Glass className="p-5">
          <p className="mb-3 font-display font-semibold">Documents</p>
          {docs.isLoading ? (
            <LoadingBlock rows={3} />
          ) : docs.error ? (
            <ErrorBox error={docs.error} />
          ) : !docs.data?.documents.length ? (
            <Empty icon={<BookOpen className="h-5 w-5" />} title="No documents yet" body="Add brand guidelines, policies or specifications." />
          ) : (
            <ul className="divide-y divide-line">
              {docs.data.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-lime" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{d.title}</span>
                    <span className="text-xs text-dim">
                      {(d.sizeBytes / 1024).toFixed(1)} KB · {fmtDate(d.createdAt)}
                    </span>
                  </span>
                  <button onClick={() => remove.mutate(d.id)} className="text-dim hover:text-danger" aria-label={`Delete ${d.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Glass>
      </div>
    </div>
  );
}
