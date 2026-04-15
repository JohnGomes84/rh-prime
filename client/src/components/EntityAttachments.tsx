import { useRef } from "react";
import { toast } from "sonner";
import { Paperclip, Unlink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDocumentsByEntity,
  useLinkDocument,
  useUnlinkDocument,
  uploadDocument,
} from "@/hooks/useDocuments";

export function EntityAttachments({
  entityType,
  entityId,
  defaultMetadata,
}: {
  entityType: string;
  entityId: string;
  defaultMetadata?: {
    documentType?: string;
    purpose?: string;
    retentionPolicy?: string;
    visibility?: "private" | "internal" | "public";
  };
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, refetch } = useDocumentsByEntity(entityType, entityId);
  const linkMutation = useLinkDocument();
  const unlinkMutation = useUnlinkDocument();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadDocument(file, {
        title: file.name,
        documentType: defaultMetadata?.documentType ?? "outro",
        purpose: defaultMetadata?.purpose ?? "administrativo",
        retentionPolicy: defaultMetadata?.retentionPolicy ?? "5anos",
        visibility: defaultMetadata?.visibility ?? "internal",
        tags: [],
      });

      await linkMutation.mutateAsync({
        documentId: uploaded.documentId,
        entityType,
        entityId,
        label: `Anexo de ${entityType}`,
      });

      toast.success("Documento anexado com sucesso.");
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao anexar documento."
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUnlink = async (documentId: string) => {
    try {
      await unlinkMutation.mutateAsync({
        documentId,
        entityType,
        entityId,
      });
      toast.success("Documento desvinculado.");
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao desvincular."
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Documentos Vinculados
          </CardTitle>
          <CardDescription>
            Anexos associados a esta entidade.
          </CardDescription>
        </div>
        <div>
          <Button onClick={() => fileInputRef.current?.click()} size="sm">
            <Upload className="h-4 w-4" />
            Anexar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && !data?.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhum documento vinculado.
          </p>
        ) : null}
        {data?.map(item => (
          <div
            key={item.linkId}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.fileName ? `${item.fileName} • ` : ""}
                {formatBytes(item.fileSize)}{item.fileName ? " • " : ""}
                {item.documentType} • {item.status}
              </p>
              {item.label ? (
                <p className="text-xs text-muted-foreground">{item.label}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
              >
                <a
                  href={`/api/documents/${item.documentId}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Baixar
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleUnlink(item.documentId)}
              >
                <Unlink className="h-4 w-4" />
                Desvincular
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(1)} ${units[index]}`;
}
