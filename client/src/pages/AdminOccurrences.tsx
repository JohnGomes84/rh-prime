import "chart.js/auto";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { trpc } from "@/lib/trpc";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

type OccurrenceType =
  | "late"
  | "early_exit"
  | "absence"
  | "client_issue"
  | "other"
  | "critical";

const occurrenceTypeOptions: Array<{ value: OccurrenceType; label: string }> = [
  { value: "late", label: "Atraso" },
  { value: "early_exit", label: "Saida antecipada" },
  { value: "absence", label: "Falta" },
  { value: "client_issue", label: "Problema com cliente" },
  { value: "other", label: "Outra ocorrencia" },
  { value: "critical", label: "Critica" },
];

export default function AdminOccurrencesPage() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clientId, setClientId] = useState("all");
  const [leaderId, setLeaderId] = useState("all");
  const [types, setTypes] = useState<OccurrenceType[]>([]);
  const [resolved, setResolved] = useState("all");
  const utils = trpc.useUtils();

  const filters = {
    dateStart: dateStart
      ? new Date(`${dateStart}T00:00:00`).toISOString()
      : undefined,
    dateEnd: dateEnd
      ? new Date(`${dateEnd}T23:59:59`).toISOString()
      : undefined,
    clientId: clientId !== "all" ? Number.parseInt(clientId, 10) : undefined,
    leaderId: leaderId !== "all" ? Number.parseInt(leaderId, 10) : undefined,
    type: types.length > 0 ? types : undefined,
    resolved:
      resolved === "resolved" ? true : resolved === "pending" ? false : undefined,
  } as const;

  const { data, isLoading, refetch } =
    trpc.admin.getOccurrencesReport.useQuery(filters);
  const { data: clients = [] } = trpc.cadastros.clients.list.useQuery();
  const { data: employees = [] } = trpc.cadastros.employees.list.useQuery();

  const resolveMutation = trpc.admin.resolveOccurrence.useMutation({
    onSuccess: async () => {
      toast.success("Ocorrencia resolvida.");
      await Promise.all([
        refetch(),
        utils.portalLider.myScheduleCards.invalidate(),
      ]);
    },
    onError: err => {
      toast.error(err.message || "Erro ao resolver ocorrencia.");
    },
  });

  const chartData = useMemo<ChartData<"bar">>(
    () => ({
      labels: data?.chart.map(item => item.typeLabel) || [],
      datasets: [
        {
          label: "Ocorrencias",
          data: data?.chart.map(item => item.count) || [],
          backgroundColor: "rgba(248, 113, 113, 0.75)",
          borderRadius: 8,
        },
      ],
    }),
    [data]
  );

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    []
  );

  const toggleType = (type: OccurrenceType) => {
    setTypes(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type]
    );
  };

  const handleExportCsv = () => {
    const rows = data?.occurrences || [];
    const headers = [
      "Data",
      "Cliente",
      "Lider",
      "Funcionario",
      "Tipo",
      "Descricao",
      "Resolvida",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((occurrence: any) =>
        [
          format(new Date(occurrence.createdAt), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          }),
          occurrence.clientName,
          occurrence.leaderName,
          occurrence.employeeName,
          occurrence.typeLabel,
          occurrence.description || "",
          occurrence.resolved ? "Sim" : "Nao",
        ]
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `occurrences-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Ocorrencias Operacionais
        </h1>
        <p className="mt-2 text-muted-foreground">
          Relatorio centralizado de atrasos, faltas, saidas antecipadas e
          problemas criticos das operacoes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Refine por periodo, cliente, lider, tipo e status de resolucao.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <Label>Data inicial</Label>
            <Input
              type="date"
              value={dateStart}
              onChange={event => setDateStart(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Data final</Label>
            <Input
              type="date"
              value={dateEnd}
              onChange={event => setDateEnd(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lider</Label>
            <Select value={leaderId} onValueChange={setLeaderId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map((employee: any) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <div className="mt-2 space-y-2 rounded-md border p-3">
              {occurrenceTypeOptions.map(option => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${option.value}`}
                    checked={types.includes(option.value)}
                    onCheckedChange={() => toggleType(option.value)}
                  />
                  <Label
                    htmlFor={`type-${option.value}`}
                    className="cursor-pointer text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Resolvida</Label>
            <Select value={resolved} onValueChange={setResolved}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="resolved">Resolvidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos mais frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ocorrencias</CardTitle>
          <CardDescription>
            {(data?.occurrences.length || 0)} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Pendentes: {data?.stats?.unresolved || 0} | Resolvidas:{" "}
              {data?.stats?.resolved || 0}
            </div>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={!data?.occurrences.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Lider</TableHead>
                  <TableHead>Funcionario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.occurrences.map((occurrence: any) => (
                  <TableRow key={occurrence.id}>
                    <TableCell className="text-sm">
                      {format(new Date(occurrence.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{occurrence.clientName}</TableCell>
                    <TableCell>{occurrence.leaderName}</TableCell>
                    <TableCell>{occurrence.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{occurrence.typeLabel}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      {occurrence.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          occurrence.resolved ? "bg-emerald-600" : "bg-amber-600"
                        }
                      >
                        {occurrence.resolved ? "Resolvida" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!occurrence.resolved ? (
                        <Button
                          size="sm"
                          onClick={() => resolveMutation.mutate(occurrence.id)}
                          disabled={resolveMutation.isPending}
                        >
                          Resolver
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.occurrences.length && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhuma ocorrencia encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
