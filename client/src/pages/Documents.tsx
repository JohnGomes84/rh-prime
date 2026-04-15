import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { uploadDocument, useDocuments } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type UploadFormState = {
  title: string;
  documentType: string;
  purpose: string;
  retentionPolicy: string;
  visibility: "private" | "internal" | "public";
  notes: string;
  tags: string;
};

const defaultUploadState: UploadFormState = {
  title: "",
  documentType: "outro",
  purpose: "administrativo",
  retentionPolicy: "5anos",
  visibility: "internal",
  notes: "",
  tags: "",
};

export default function DocumentsPage() {
  const utils = trpc.useUtils();
  const { canCreate, canEdit } = usePermissions();
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFormState>(
    defaultUploadState
  );
  const [uploading, setUploading] = useState(false);

  const documentsQuery = useDocuments({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    documentType: documentType === "all" ? undefined : documentType,
    status:
      status === "all" ? undefined : (status as "ativo" | "arquivado"),
  });

  const archiveMutation = trpc.documents.archive.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  });

  const restoreMutation = trpc.documents.restore.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  });

  const items = documentsQuery.data?.items ?? [];
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter(item => item.status === "ativo").length;
    const archived = items.filter(item => item.status === "arquivado").length;
    return { total, active, archived };
  }, [items]);

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadState(defaultUploadState);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo.");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(selectedFile, {
        title: uploadState.title || selectedFile.name,
        documentType: uploadState.documentType,
        purpose: uploadState.purpose,
        retentionPolicy: uploadState.retentionPolicy,
        visibility: uploadState.visibility,
        notes: uploadState.notes || undefined,
        tags: uploadState.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
      });

      toast.success("Documento enviado com sucesso.");
      setIsUploadOpen(false);
      resetUpload();
      utils.documents.list.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar documento."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveToggle = async (
    documentId: string,
    archived: boolean
  ) => {
    try {
      if (archived) {
        await restoreMutation.mutateAsync(documentId);
        toast.success("Documento restaurado.");
      } else {
        await archiveMutation.mutateAsync(documentId);
        toast.success("Documento arquivado.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar documento."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FolderOpen className="h-8 w-8 text-primary" />
            Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão documental com versionamento, auditoria e download seguro.
          </p>
        </div>
        {canCreate("documents") ? (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Documento</DialogTitle>
                <DialogDescription>
                  Upload raw com persistência, trilha de auditoria e ponto de retorno.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">Arquivo</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={event =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={uploadState.title}
                    onChange={event =>
                      setUploadState(state => ({
                        ...state,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Nome exibido para o documento"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select
                      value={uploadState.documentType}
                      onValueChange={value =>
                        setUploadState(state => ({ ...state, documentType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrato">Contrato</SelectItem>
                        <SelectItem value="relatorio">Relatório</SelectItem>
                        <SelectItem value="ata">Ata</SelectItem>
                        <SelectItem value="correspondencia">Correspondência</SelectItem>
                        <SelectItem value="projeto">Projeto</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="juridico">Jurídico</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Finalidade</Label>
                    <Select
                      value={uploadState.purpose}
                      onValueChange={value =>
                        setUploadState(state => ({ ...state, purpose: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="fiscal">Fiscal</SelectItem>
                        <SelectItem value="juridico">Jurídico</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Retenção</Label>
                    <Select
                      value={uploadState.retentionPolicy}
                      onValueChange={value =>
                        setUploadState(state => ({
                          ...state,
                          retentionPolicy: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1ano">1 ano</SelectItem>
                        <SelectItem value="3anos">3 anos</SelectItem>
                        <SelectItem value="5anos">5 anos</SelectItem>
                        <SelectItem value="10anos">10 anos</SelectItem>
                        <SelectItem value="permanente">Permanente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Visibilidade</Label>
                    <Select
                      value={uploadState.visibility}
                      onValueChange={value =>
                        setUploadState(state => ({
                          ...state,
                          visibility: value as UploadFormState["visibility"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Interno</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                        <SelectItem value="public">Público</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={uploadState.tags}
                    onChange={event =>
                      setUploadState(state => ({
                        ...state,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="financeiro, contrato, cliente"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={uploadState.notes}
                    onChange={event =>
                      setUploadState(state => ({
                        ...state,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Notas internas do documento"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUploadOpen(false);
                    resetUpload();
                  }}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total</CardDescription>
            <CardTitle>{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ativos</CardDescription>
            <CardTitle>{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Arquivados</CardDescription>
            <CardTitle>{stats.archived}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busca e filtros</CardTitle>
          <CardDescription>
            Filtre por texto, tipo e status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por título..."
              className="pl-9"
            />
          </div>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="contrato">Contrato</SelectItem>
              <SelectItem value="relatorio">Relatório</SelectItem>
              <SelectItem value="ata">Ata</SelectItem>
              <SelectItem value="correspondencia">Correspondência</SelectItem>
              <SelectItem value="projeto">Projeto</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="juridico">Jurídico</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => documentsQuery.refetch()}
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acervo</CardTitle>
          <CardDescription>
            {documentsQuery.data?.total ?? 0} documento(s) encontrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando documentos...</p>
          ) : null}
          {!documentsQuery.isLoading && !items.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum documento encontrado com os filtros atuais.
            </p>
          ) : null}
          {items.map(item => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="truncate font-medium">{item.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.documentType} • {item.purpose} • v{item.latestVersionNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {item.status} • Atualizado em{" "}
                  {new Date(item.updatedAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/documents/${item.id}/download`} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    Baixar
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const doc = await utils.documents.getById.fetch(item.id);
                      toast.message(doc.title, {
                        description: `Versões: ${doc.versions.length} • Tags: ${doc.tags.length} • Links: ${doc.links.length}`,
                      });
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Falha ao carregar documento."
                      );
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Detalhes
                </Button>
                {canEdit("documents") ? (
                  <Button
                    size="sm"
                    variant={item.status === "arquivado" ? "default" : "ghost"}
                    onClick={() =>
                      handleArchiveToggle(item.id, item.status === "arquivado")
                    }
                  >
                    <Archive className="h-4 w-4" />
                    {item.status === "arquivado" ? "Restaurar" : "Arquivar"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
