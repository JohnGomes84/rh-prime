import { trpc } from "@/lib/trpc";

export type DocumentFilters = {
  search?: string;
  documentType?: string;
  purpose?: string;
  status?: "ativo" | "arquivado";
  ownerUserId?: number;
  page?: number;
  pageSize?: number;
};

export function useDocuments(filters: DocumentFilters) {
  return trpc.documents.list.useQuery(filters);
}

export function useDocument(documentId: string, enabled = true) {
  return trpc.documents.getById.useQuery(documentId, { enabled });
}

export function useDocumentsByEntity(entityType: string, entityId: string) {
  return trpc.documents.listByEntity.useQuery(
    { entityType, entityId },
    { enabled: Boolean(entityType && entityId) }
  );
}

export function useLinkDocument() {
  const utils = trpc.useUtils();
  return trpc.documents.linkEntity.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      utils.documents.listByEntity.invalidate();
    },
  });
}

export function useUnlinkDocument() {
  const utils = trpc.useUtils();
  return trpc.documents.unlinkEntity.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      utils.documents.listByEntity.invalidate();
    },
  });
}

export async function uploadDocument(
  file: File,
  metadata: Record<string, unknown>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }

    params.append(key, String(value));
  }

  const response = await fetch(`/api/documents/upload?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-File-Mime-Type": file.type || "application/octet-stream",
    },
    credentials: "include",
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Falha no upload do documento.");
  }

  return response.json();
}
