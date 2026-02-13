import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Audit() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    resource: "",
    action: "",
    cpf: "",
  });

  const { data: auditData, isLoading } = trpc.audit.list.useQuery({
    limit: 100,
    offset: 0,
    resource: filters.resource || undefined,
    action: filters.action || undefined,
    cpf: filters.cpf || undefined,
  });

  const { data: summary } = trpc.audit.summary.useQuery({
    days: 7,
  });

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
    READ: "bg-gray-100 text-gray-800",
  };

  const logs = auditData?.logs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoria</h1>
        <p className="text-gray-600">Histórico completo de alterações no sistema</p>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total de Eventos (7 dias)</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Ações Principais</div>
            <div className="text-sm mt-2">
              {Object.entries(summary.byAction).map(([action, count]) => (
                <div key={action} className="flex justify-between">
                  <span>{action}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Recursos Alterados</div>
            <div className="text-sm mt-2">
              {Object.entries(summary.byResource).slice(0, 3).map(([resource, count]) => (
                <div key={resource} className="flex justify-between">
                  <span>{resource}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recurso</label>
            <Input
              placeholder="Ex: employees"
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ação</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="CREATE">Criar</option>
              <option value="UPDATE">Atualizar</option>
              <option value="DELETE">Deletar</option>
              <option value="READ">Ler</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CPF/Usuário</label>
            <Input
              placeholder="CPF do usuário"
              value={filters.cpf}
              onChange={(e) => setFilters({ ...filters, cpf: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Logs */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
        ) : (
          logs.map((log, idx) => (
            <Card key={idx} className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === idx ? null : idx)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge className={actionColors[log.action] || "bg-gray-100"}>
                      {log.action}
                    </Badge>
                    <span className="font-semibold">{log.resource}</span>
                    {log.resourceId && (
                      <span className="text-gray-600">ID: {log.resourceId}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {log.cpf} • {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </div>
                  {log.description && (
                    <div className="text-sm text-gray-700 mt-1">{log.description}</div>
                  )}
                </div>
                <div className="text-gray-400">
                  {expandedId === idx ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {expandedId === idx && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {log.changesBefore && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Antes:</h4>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(log.changesBefore, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.changesAfter && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Depois:</h4>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(log.changesAfter, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
