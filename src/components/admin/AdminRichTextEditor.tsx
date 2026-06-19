"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { Editor as TinyMceEditor } from "tinymce";

const Editor = dynamic(() => import("@tinymce/tinymce-react").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm text-zinc-500">
      Editör yükleniyor…
    </div>
  ),
});

const TINYMCE_SRC = "/tinymce/tinymce.min.js";

async function uploadEditorImage(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type || "image/jpeg" }));
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { error?: string; media?: { url: string } };
  if (!res.ok) throw new Error(json.error ?? "Görsel yüklenemedi");
  if (!json.media?.url) throw new Error("Görsel yüklenemedi");
  return json.media.url;
}

export function AdminRichTextEditor({
  label,
  hint,
  value,
  onChange,
  height = 420,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
  height?: number;
}) {
  const [ready, setReady] = useState(false);

  const handleImagesUpload = useCallback(
    (blobInfo: { blob: () => Blob; filename: () => string }) =>
      uploadEditorImage(blobInfo.blob(), blobInfo.filename()),
    [],
  );

  return (
    <div className="space-y-2">
      <div>
        <span className="block text-sm font-medium text-zinc-800">{label}</span>
        {hint ? <p className="mt-0.5 text-xs text-zinc-600">{hint}</p> : null}
      </div>

      <div
        className={`overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm ${
          ready ? "" : "min-h-[360px]"
        }`}
      >
        <Editor
          tinymceScriptSrc={TINYMCE_SRC}
          licenseKey="gpl"
          value={value}
          onEditorChange={onChange}
          onInit={() => setReady(true)}
          init={{
            base_url: "/tinymce",
            suffix: ".min",
            height,
            menubar: false,
            branding: false,
            promotion: false,
            statusbar: true,
            resize: true,
            skin_url: "/tinymce/skins/ui/oxide",
            content_css: "/tinymce/skins/content/default/content.min.css",
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "image",
              "charmap",
              "preview",
              "anchor",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "help",
              "wordcount",
              "emoticons",
            ],
            toolbar_mode: "wrap",
            toolbar: [
              "undo redo | code | removeformat | blocks | bold italic underline",
              "alignleft aligncenter alignright alignjustify",
              "bullist numlist | outdent indent | link image | preview media",
              "forecolor backcolor | emoticons table",
            ].join(" | "),
            block_formats:
              "Paragraf=p; Başlık 2=h2; Başlık 3=h3; Başlık 4=h4; Alıntı=blockquote",
            content_style:
              "body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 15px; line-height: 1.65; color: #18181b; }",
            paste_as_text: false,
            convert_urls: false,
            relative_urls: false,
            images_upload_handler: handleImagesUpload,
            setup: (editor: TinyMceEditor) => {
              editor.on("init", () => {
                editor.getContainer()?.setAttribute("data-testid", "rich-text-editor");
              });
            },
          }}
          scriptLoading={{
            async: true,
            defer: true,
          }}
        />
      </div>

      {!ready ? (
        <p className="text-xs text-zinc-500">Araç çubuğu birkaç saniye içinde görünür.</p>
      ) : null}
    </div>
  );
}
