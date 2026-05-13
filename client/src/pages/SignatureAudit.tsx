import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export function SignatureAudit() {
  const [cpf, setCpf] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "invalid">("all");

  const logsQuery = trpc.auditCpf.getByCpf.useQuery(
    { cpf },
    { enabled: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), retry: false }
  );
  const statsQuery = trpc.auditCpf.getStatsByCpf.useQuery(
    { cpf },
    { enabled: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), retry: false }
  );

  const filteredLogs = (logsQuery.data ?? []).filter((log) => {
    const matchesSearch =
      (log.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "valid" && log.action === "SIGN") ||
      (filterStatus === "invalid" && log.action !== "SIGN");
    return matchesSearch && matchesStatus;
  });

  const handleExportAudit = () => {
    const csv = [
      ["ID", "Recurso", "Ação", "Descrição", "CPF", "Data/Hora", "IP"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.id,
          `"${log.resource}"`,
          log.action,
          `"${log.description}"`,
          log.cpf,
          new Date(log.timestamp).toLocaleString("pt-BR"),
          log.ipAddress || "N/A",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-assinaturas-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria de Assinaturas</h1>
            <p className="text-muted-foreground mt-2">
              Consulta real sobre os eventos auditados por CPF.
            </p>
          </div>
          <Button onClick={handleExportAudit} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CPF</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="123.456.789-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Descrição ou recurso"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={(value: "all" | "valid" | "invalid") => setFilterStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="valid">Assinaturas</SelectItem>
                    <SelectItem value="invalid">Outros eventos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{filteredLogs.length}</p>
                <p className="text-sm text-muted-foreground">Eventos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {statsQuery.data?.totalOperations ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Operações</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {Object.keys(statsQuery.data?.byAction ?? {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Tipos de ação</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {Object.keys(statsQuery.data?.byResource ?? {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Recursos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Eventos de Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado para o CPF informado.</p>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="rounded border p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.resource}</Badge>
                    <Badge>{log.action}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{log.description}</p>
                  <p className="text-xs text-muted-foreground">
                    CPF: {log.cpf} • {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
