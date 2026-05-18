import { useRef, useState } from "react";
import { Loader2, Paperclip, Send, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CardInlineExpanded({
  cardId,
  boardId,
  canEdit,
}: {
  cardId: number;
  boardId: number;
  canEdit: boolean;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.kanban.cards.get.useQuery({ id: cardId });
  const commentsQuery = trpc.kanban.comments.list.useQuery({ cardId, boardId });
  const attachmentsQuery = trpc.kanban.attachments.list.useQuery({ cardId, boardId });

  const [newChecklistContent, setNewChecklistContent] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidateChecklist = async () => {
    await Promise.all([
      utils.kanban.cards.get.invalidate({ id: cardId }),
      utils.kanban.cards.listByBoard.invalidate({ boardId }),
    ]);
  };

  const createChecklistItem = trpc.kanban.checklist.create.useMutation({
    onSuccess: async () => {
      await invalidateChecklist();
      setNewChecklistContent("");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao adicionar item"),
  });

  const updateChecklistItem = trpc.kanban.checklist.update.useMutation({
    onSuccess: invalidateChecklist,
    onError: (err) => toast.error(err.message ?? "Falha ao atualizar"),
  });

  const deleteChecklistItem = trpc.kanban.checklist.delete.useMutation({
    onSuccess: invalidateChecklist,
    onError: (err) => toast.error(err.message ?? "Falha ao remover"),
  });

  const createComment = trpc.kanban.comments.create.useMutation({
    onSuccess: async () => {
      await utils.kanban.comments.list.invalidate({ cardId, boardId });
      setNewCommentBody("");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao comentar"),
  });

  const deleteComment = trpc.kanban.comments.delete.useMutation({
    onSuccess: async () => {
      await utils.kanban.comments.list.invalidate({ cardId, boardId });
    },
    onError: (err) => toast.error(err.message ?? "Falha ao remover comentario"),
  });

  const registerAttachment = trpc.kanban.attachments.register.useMutation({
    onSuccess: async () => {
      await utils.kanban.attachments.list.invalidate({ cardId, boardId });
      toast.success("Anexo carregado");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao registrar anexo"),
  });

  const deleteAttachment = trpc.kanban.attachments.delete.useMutation({
    onSuccess: async () => {
      await utils.kanban.attachments.list.invalidate({ cardId, boardId });
    },
    onError: (err) => toast.error(err.message ?? "Falha ao remover anexo"),
  });

  const handleUploadFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Arquivo maior que 4MB — limite atual.");
      return;
    }
    try {
      setAttachmentUploading(true);
      const resp = await fetch(
        `/api/upload-attachment?cardId=${cardId}&filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
          credentials: "include",
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error ?? "Falha no upload");
      }
      const blob = (await resp.json()) as {
        url: string;
        pathname?: string;
        contentType?: string;
        size?: number;
      };
      await registerAttachment.mutateAsync({
        cardId,
        boardId,
        fileName: file.name,
        fileUrl: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        sizeBytes: blob.size,
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAttachmentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Carregando...
      </div>
    );
  }

  const checklist = data.checklist ?? [];
  const comments = commentsQuery.data ?? [];
  const attachments = attachmentsQuery.data ?? [];

  return (
    <div
      className="mt-3 space-y-4 border-t pt-3 text-xs"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* CHECKLIST */}
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Checklist ({checklist.filter((it) => it.isDone).length}/{checklist.length})
          </span>
        </div>
        <ul className="space-y-1">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={!!item.isDone}
                disabled={!canEdit}
                onCheckedChange={(checked) => {
                  updateChecklistItem.mutate({
                    id: item.id,
                    boardId,
                    isDone: !!checked,
                  });
                }}
              />
              <span
                className={
                  item.isDone
                    ? "flex-1 line-through text-muted-foreground"
                    : "flex-1"
                }
              >
                {item.content}
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-600"
                  onClick={() =>
                    deleteChecklistItem.mutate({ id: item.id, boardId })
                  }
                  aria-label="Remover item"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2 flex gap-1">
            <Input
              value={newChecklistContent}
              onChange={(e) => setNewChecklistContent(e.target.value)}
              placeholder="Novo item"
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newChecklistContent.trim()) {
                  e.preventDefault();
                  createChecklistItem.mutate({
                    cardId,
                    boardId,
                    content: newChecklistContent.trim(),
                  });
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              disabled={!newChecklistContent.trim()}
              onClick={() =>
                createChecklistItem.mutate({
                  cardId,
                  boardId,
                  content: newChecklistContent.trim(),
                })
              }
            >
              +
            </Button>
          </div>
        )}
      </section>

      {/* COMMENTS */}
      <section>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Comentarios ({comments.length})
        </div>
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2 rounded bg-muted/50 p-2">
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">
                  {(c.authorName ?? c.authorEmail ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-medium">
                    {c.authorName ?? c.authorEmail ?? "Usuario"}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-red-600"
                      onClick={() =>
                        deleteComment.mutate({ id: c.id, boardId })
                      }
                      aria-label="Remover comentario"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-xs">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2 flex gap-1">
            <Textarea
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              placeholder="Escreva um comentario..."
              rows={2}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newCommentBody.trim()) {
                  e.preventDefault();
                  createComment.mutate({
                    cardId,
                    boardId,
                    body: newCommentBody.trim(),
                  });
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 self-end"
              disabled={!newCommentBody.trim() || createComment.isPending}
              onClick={() =>
                createComment.mutate({
                  cardId,
                  boardId,
                  body: newCommentBody.trim(),
                })
              }
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </section>

      {/* ATTACHMENTS */}
      <section>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Anexos ({attachments.length})
        </div>
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              <a
                href={`/api/blob/proxy?url=${encodeURIComponent(a.fileUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-xs text-primary hover:underline"
              >
                {a.fileName}
              </a>
              <a
                href={`/api/blob/proxy?url=${encodeURIComponent(a.fileUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground"
                aria-label="Abrir"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              {canEdit && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-600"
                  onClick={() =>
                    deleteAttachment.mutate({ id: a.id, boardId })
                  }
                  aria-label="Remover anexo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={attachmentUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {attachmentUploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="mr-1 h-3 w-3" />
              )}
              Anexar
            </Button>
            <span className="text-[10px] text-muted-foreground">
              PDF/JPG/PNG/WEBP/HEIC, ate 4MB
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
