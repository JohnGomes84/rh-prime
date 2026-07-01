import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Clock, FileText, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";

type Demand = {
  id: number;
  requesterId: number;
  classifierId?: number | null;
  executorId?: number | null;
  title: string;
  description?: string | null;
  priority: "baixa" | "normal" | "alta" | "urgente";
  category: "rh_adm" | "financeiro" | "operacional";
  status: "pendente" | "classificada" | "em_andamento" | "aguardando_retorno" | "concluida" | "cancelada";
  dueDate: string | Date;
  classifiedAt?: string | Date | null;
  startedAt?: string | Date | null;
  returnedAt?: string | Date | null;
  completedAt?: string | Date | null;
  wasOnTime?: boolean | null;
  classificationNotes?: string | null;
  returnNotes?: string | null;
  completionNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const PRIORITY_COLORS = {
  baixa: "bg-blue-100 text-blue-800",
  normal: "bg-gray-100 text-gray-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-800",
  classificada: "bg-purple-100 text-purple-800",
  em_andamento: "bg-blue-100 text-blue-800",
  aguardando_retorno: "bg-indigo-100 text-indigo-800",
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-gray-100 text-gray-800",
};

export default function Demands() {
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [classifyForm, setClassifyForm] = useState({ notes: "", executorId: "", priority: "normal" });
  const [executeForm, setExecuteForm] = useState({ notes: "" });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "rh_adm" as const,
    priority: "normal" as const,
    dueDate: "",
  });

  const { data: demands = [] } = trpc.demands.list.useQuery({});
  const { data: users = [] } = trpc.users.listUsers.useQuery();

  const createMutation = trpc.demands.create.useMutation();
  const classifyMutation = trpc.demands.classify.useMutation();
  const startMutation = trpc.demands.startExecution.useMutation();
  const returnMutation = trpc.demands.returnForReview.useMutation();
  const completeMutation = trpc.demands.complete.useMutation();
  const cancelMutation = trpc.demands.cancel.useMutation();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      setFormData({ title: "", description: "", category: "rh_adm", priority: "normal", dueDate: "" });
      setIsCreateOpen(false);
      toast.success("Demanda criada");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao criar");
    }
  };

  const handleClassify = async () => {
    if (!selectedDemand || !classifyForm.executorId) return;
    try {
      await classifyMutation.mutateAsync({
        demandId: selectedDemand.id,
        executorId: Number(classifyForm.executorId),
        priority: classifyForm.priority as any,
        classificationNotes: classifyForm.notes,
      });
      setClassifyOpen(false);
      toast.success("Demanda classificada");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao classificar");
    }
  };

  const handleStartExecution = async () => {
    if (!selectedDemand) return;
    try {
      await startMutation.mutateAsync({ demandId: selectedDemand.id });
      setExecuteOpen(false);
      toast.success("Execução iniciada");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao iniciar");
    }
  };

  const handleReturnForReview = async () => {
    if (!selectedDemand) return;
    try {
      await returnMutation.mutateAsync({
        demandId: selectedDemand.id,
        returnNotes: executeForm.notes,
      });
      setExecuteOpen(false);
      toast.success("Retornada para review");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao retornar");
    }
  };

  const handleComplete = async () => {
    if (!selectedDemand) return;
    try {
      await completeMutation.mutateAsync({
        demandId: selectedDemand.id,
        completionNotes: executeForm.notes,
      });
      setExecuteOpen(false);
      setDetailOpen(false);
      toast.success("Demanda concluída");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao concluir");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelMutation.mutateAsync({ demandId: id });
      toast.success("Demanda cancelada");
      utils.demands.list.invalidate();
    } catch (error) {
      toast.error("Erro ao cancelar");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Demandas</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Nova Demanda</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Demanda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Título da demanda"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva a demanda"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rh_adm">RH/Administrativo</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending || !formData.title || !formData.dueDate}>
                {createMutation.isPending ? "Criando..." : "Criar Demanda"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demands.filter((d: Demand) => d.status === "pendente").length}</div>
            <p className="text-xs text-gray-500">Aguardando classificação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demands.filter((d: Demand) => d.status === "em_andamento").length}</div>
            <p className="text-xs text-gray-500">Sendo executadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Para Revisar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demands.filter((d: Demand) => d.status === "aguardando_retorno").length}</div>
            <p className="text-xs text-gray-500">Aguardando validação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demands.filter((d: Demand) => d.status === "concluida").length}</div>
            <p className="text-xs text-gray-500">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Demands list */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Demandas</h2>
        {demands.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              Nenhuma demanda encontrada
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {demands.map((demand: Demand) => (
              <Card key={demand.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                   <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{demand.title}</h3>
                        <Badge className={PRIORITY_COLORS[demand.priority as keyof typeof PRIORITY_COLORS]}>
                          {demand.priority.charAt(0).toUpperCase() + demand.priority.slice(1)}
                        </Badge>
                       <Badge className={STATUS_COLORS[demand.status as keyof typeof STATUS_COLORS]}>
                         {demand.status.replace(/_/g, " ").toUpperCase()}
                       </Badge>
                     </div>
                     <p className="text-sm text-gray-600">{demand.description}</p>
                     <div className="flex items-center gap-4 text-xs text-gray-500">
                       <span>Categoria: <strong>{demand.category.replace(/_/g, " ").toUpperCase()}</strong></span>
                       <span>Prazo: <strong>{new Date(demand.dueDate).toLocaleDateString("pt-BR")}</strong></span>
                     </div>
                     <div className="flex gap-2 pt-2">
                       {demand.status === "pendente" && (
                         <Dialog open={classifyOpen && selectedDemand?.id === demand.id} onOpenChange={(open) => { setClassifyOpen(open); if (open) setSelectedDemand(demand); }}>
                           <DialogTrigger asChild>
                             <Button size="sm" variant="outline">Classificar</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader><DialogTitle>Classificar Demanda</DialogTitle></DialogHeader>
                             <div className="space-y-4">
                               <div>
                                 <Label className="text-sm font-medium">Executor</Label>
                                 <Select value={classifyForm.executorId} onValueChange={(v) => setClassifyForm({ ...classifyForm, executorId: v })}>
                                   <SelectTrigger><SelectValue placeholder="Selecionar executor" /></SelectTrigger>
                                   <SelectContent>
                                     {users.map((u: any) => (
                                       <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <Label className="text-sm font-medium">Prioridade</Label>
                                 <Select value={classifyForm.priority} onValueChange={(v) => setClassifyForm({ ...classifyForm, priority: v })}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="baixa">Baixa</SelectItem>
                                     <SelectItem value="normal">Normal</SelectItem>
                                     <SelectItem value="alta">Alta</SelectItem>
                                     <SelectItem value="urgente">Urgente</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <Label className="text-sm font-medium">Notas</Label>
                                 <Textarea value={classifyForm.notes} onChange={(e) => setClassifyForm({ ...classifyForm, notes: e.target.value })} placeholder="Instruções para o executor..." />
                               </div>
                             </div>
                             <DialogFooter>
                               <Button onClick={handleClassify} disabled={classifyMutation.isPending || !classifyForm.executorId}>{classifyMutation.isPending ? "Classificando..." : "Classificar"}</Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>
                       )}
                       {demand.status === "classificada" && (
                         <Button size="sm" variant="outline" onClick={handleStartExecution} disabled={startMutation.isPending}>
                           {startMutation.isPending ? "Iniciando..." : "Iniciar"}
                         </Button>
                       )}
                       {demand.status === "em_andamento" && (
                         <Dialog open={executeOpen && selectedDemand?.id === demand.id && selectedDemand.status === "em_andamento"} onOpenChange={(open) => { setExecuteOpen(open); if (open) setSelectedDemand(demand); }}>
                           <DialogTrigger asChild>
                             <Button size="sm" variant="outline">Retornar</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader><DialogTitle>Retornar para Review</DialogTitle></DialogHeader>
                             <div>
                               <Label className="text-sm font-medium">Resultado / Notas</Label>
                               <Textarea value={executeForm.notes} onChange={(e) => setExecuteForm({ ...executeForm, notes: e.target.value })} placeholder="Descreva o resultado..." />
                             </div>
                             <DialogFooter>
                               <Button onClick={handleReturnForReview} disabled={returnMutation.isPending}>{returnMutation.isPending ? "Retornando..." : "Retornar"}</Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>
                       )}
                       {demand.status === "aguardando_retorno" && (
                         <Dialog open={executeOpen && selectedDemand?.id === demand.id && selectedDemand.status === "aguardando_retorno"} onOpenChange={(open) => { setExecuteOpen(open); if (open) setSelectedDemand(demand); }}>
                           <DialogTrigger asChild>
                             <Button size="sm" variant="outline">Entregar</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader><DialogTitle>Entregar Demanda</DialogTitle></DialogHeader>
                             <div>
                               <Label className="text-sm font-medium">Validação / Notas Finais</Label>
                               <Textarea value={executeForm.notes} onChange={(e) => setExecuteForm({ ...executeForm, notes: e.target.value })} placeholder="Informações da entrega..." />
                             </div>
                             <DialogFooter>
                               <Button onClick={handleComplete} disabled={completeMutation.isPending}>{completeMutation.isPending ? "Entregando..." : "Entregar"}</Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>
                       )}
                       <Button size="sm" variant="ghost" onClick={() => { setSelectedDemand(demand); setDetailOpen(true); }}>
                         <Eye className="h-4 w-4" />
                       </Button>
                       {demand.status !== "concluida" && demand.status !== "cancelada" && (
                         <Button size="sm" variant="ghost" onClick={() => handleCancel(demand.id)} disabled={cancelMutation.isPending}>Cancelar</Button>
                       )}
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
       <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{selectedDemand?.title}</DialogTitle>
         </DialogHeader>
         {selectedDemand && (
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div><strong>Status:</strong> {selectedDemand.status.replace(/_/g, " ").toUpperCase()}</div>
               <div><strong>Prioridade:</strong> {selectedDemand.priority.toUpperCase()}</div>
               <div><strong>Categoria:</strong> {selectedDemand.category.replace(/_/g, " ").toUpperCase()}</div>
               <div><strong>Prazo:</strong> {new Date(selectedDemand.dueDate).toLocaleDateString("pt-BR")}</div>
               <div><strong>Criada em:</strong> {new Date(selectedDemand.createdAt).toLocaleString("pt-BR")}</div>
               {selectedDemand.wasOnTime !== null && <div><strong>No prazo:</strong> {selectedDemand.wasOnTime ? "✓ Sim" : "✗ Não"}</div>}
             </div>
             <div>
               <strong>Descrição:</strong>
               <p className="text-sm text-gray-600 mt-1">{selectedDemand.description}</p>
             </div>
             {selectedDemand.classificationNotes && (
               <div className="bg-blue-50 p-3 rounded text-sm">
                 <strong>Notas de Classificação:</strong>
                 <p className="mt-1">{selectedDemand.classificationNotes}</p>
               </div>
             )}
             {selectedDemand.returnNotes && (
               <div className="bg-amber-50 p-3 rounded text-sm">
                 <strong>Notas de Retorno:</strong>
                 <p className="mt-1">{selectedDemand.returnNotes}</p>
               </div>
             )}
             {selectedDemand.completionNotes && (
               <div className="bg-green-50 p-3 rounded text-sm">
                 <strong>Notas de Conclusão:</strong>
                 <p className="mt-1">{selectedDemand.completionNotes}</p>
               </div>
             )}
           </div>
         )}
       </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
