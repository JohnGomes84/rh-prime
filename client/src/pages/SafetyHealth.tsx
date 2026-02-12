import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, AlertTriangle, Briefcase } from "lucide-react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function SafetyHealth() {
  const { data: ppeDeliveries, isLoading: ppeLoading } = trpc.ppeDeliveries.list.useQuery({});
  const { data: serviceOrders, isLoading: ordersLoading } = trpc.serviceOrders.list.useQuery({});
  const { data: trainings, isLoading: trainingsLoading } = trpc.trainings.list.useQuery({});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saúde e Segurança</h1>
          <p className="text-muted-foreground">Controle de EPIs, ordens de serviço, treinamentos e conformidade regulatória.</p>
        </div>

        <Tabs defaultValue="epis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="epis">EPIs</TabsTrigger>
            <TabsTrigger value="ordens">Ordens de Serviço</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
          </TabsList>

          {/* EPIs */}
          <TabsContent value="epis">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Entregas de EPI</CardTitle></CardHeader>
              <CardContent className="p-0">
                {ppeLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : !ppeDeliveries || ppeDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhuma entrega de EPI registrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>EPI</TableHead>
                        <TableHead>CA</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Data Entrega</TableHead>
                        <TableHead>Devolução</TableHead>
                        <TableHead>Assinatura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ppeDeliveries.map((ppe: any) => (
                        <TableRow key={ppe.id}>
                          <TableCell className="font-medium">{ppe.employeeName || `ID ${ppe.employeeId}`}</TableCell>
                          <TableCell>{ppe.ppeDescription}</TableCell>
                          <TableCell>{ppe.caNumber || "-"}</TableCell>
                          <TableCell>{ppe.quantity}</TableCell>
                          <TableCell>{formatDate(ppe.deliveryDate)}</TableCell>
                          <TableCell>{formatDate(ppe.returnDate) || "Pendente"}</TableCell>
                          <TableCell>
                            <Badge variant={ppe.employeeSignature ? "default" : "secondary"}>
                              {ppe.employeeSignature ? "Assinado" : "Não assinado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ordens de Serviço */}
          <TabsContent value="ordens">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Ordens de Serviço (NR)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {ordersLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : !serviceOrders || serviceOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhuma ordem de serviço registrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Cargo/Função</TableHead>
                        <TableHead>NR Aplicável</TableHead>
                        <TableHead>Data Emissão</TableHead>
                        <TableHead>Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.employeeName || `ID ${order.employeeId}`}</TableCell>
                          <TableCell>{order.jobTitle || "-"}</TableCell>
                          <TableCell>{order.nrNumber || "-"}</TableCell>
                          <TableCell>{formatDate(order.issueDate)}</TableCell>
                          <TableCell>
                            <Badge variant={order.riskLevel === "Alto" ? "destructive" : "secondary"}>
                              {order.riskLevel || "-"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treinamentos */}
          <TabsContent value="treinamentos">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Treinamentos</CardTitle></CardHeader>
              <CardContent className="p-0">
                {trainingsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : !trainings || trainings.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhum treinamento registrado.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Treinamento</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Instrutor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainings.map((training: any) => {
                        const isExpired = training.expiryDate && new Date(training.expiryDate) < new Date();
                        return (
                          <TableRow key={training.id}>
                            <TableCell className="font-medium">{training.employeeName || `ID ${training.employeeId}`}</TableCell>
                            <TableCell>{training.trainingName}</TableCell>
                            <TableCell>{formatDate(training.trainingDate)}</TableCell>
                            <TableCell className={isExpired ? "text-destructive font-medium" : ""}>
                              {formatDate(training.expiryDate)}
                            </TableCell>
                            <TableCell>{training.instructorName || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={isExpired ? "destructive" : "default"}>
                                {isExpired ? "Vencido" : "Válido"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
