import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2, Download, Trash2, FolderOpen, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

const DOCUMENT_CATEGORIES = [
  "Pessoal",
  "Contratual",
  "Saúde e Segurança",
  "Benefícios",
  "Termos",
  "Treinamentos",
  "Outros",
];

export default function Documents() {
  const { data: documents, isLoading } = trpc.documents.list.useQuery({});
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("Documento enviado com sucesso!");
      setDialogOpen(false);
      setUploadFile(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("Documento removido!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Selecione um arquivo!");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const buffer = await uploadFile.arrayBuffer();
    uploadMutation.mutate({
      employeeId: fd.get("employeeId") ? Number(fd.get("employeeId")) : 0,
      documentName: fd.get("documentName") as string,
      category: fd.get("category") as "Pessoal" | "Contratual" | "Saúde e Segurança" | "Benefícios" | "Termos" | "Treinamentos" | "Outros",
      fileBase64: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer)) as any)),
      fileName: uploadFile.name,
      fileType: uploadFile.type,
      fileSize: uploadFile.size,
      expiryDate: (fd.get("expirationDate") as string) || undefined,
    });
  };

  const expiredCount = documents?.filter((d: any) => {
    if (!d.expirationDate) return false;
    return new Date(d.expirationDate) < new Date();
  }).length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dossiê Digital (GED)</h1>
            <p className="text-muted-foreground">Armazenamento seguro e organizado de documentos dos funcionários.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Documento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Funcionário (ID) *</Label>
                  <Input name="employeeId" type="number" required />
                </div>
                <div>
                  <Label>Nome do Documento *</Label>
                  <Input name="documentName" placeholder="Ex: RG - João Silva" required />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select name="category" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Validade</Label>
                  <Input name="expirationDate" type="date" />
                </div>
                <div>
                  <Label>Arquivo *</Label>
                  <Input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {expiredCount > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Documentos Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{expiredCount}</p>
              <p className="text-xs text-muted-foreground">Documentos com validade expirada</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Todos os Documentos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !documents || documents.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum documento no dossiê.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data Upload</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => {
                    const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                        <TableCell>{doc.employeeName || `ID ${doc.employeeId}`}</TableCell>
                        <TableCell><Badge variant="secondary">{doc.category}</Badge></TableCell>
                        <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                        <TableCell>
                          <span className={isExpired ? "text-destructive font-medium" : ""}>
                            {formatDate(doc.expirationDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {doc.documentUrl && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={doc.documentUrl} download target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm("Deseja realmente excluir este documento?")) deleteMutation.mutate({ id: doc.id });
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
