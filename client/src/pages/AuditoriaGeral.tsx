import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AuditoriaGeral() {
  const [resource, setResource] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [cpf, setCpf] = useState("");

  const byResourceQuery = trpc.audit.getByResource.useQuery(
    { resource, resourceId: Number(resourceId) },
    { enabled: !!resource && !!resourceId }
  );
  const byUserQuery = trpc.audit.getByUser.useQuery(
    { cpf },
    { enabled: !!cpf }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auditoria Geral</h1>
          <p className="text-muted-foreground mt-2">
            Consulte eventos de auditoria por recurso ou CPF.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Por Recurso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resource">Recurso</Label>
                <Input id="resource" value={resource} onChange={(event) => setResource(event.target.value)} placeholder="documents" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resourceId">ID do recurso</Label>
                <Input id="resourceId" value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="1" />
              </div>
              <pre className="rounded bg-slate-950 p-4 text-xs text-slate-50 overflow-auto">
                {JSON.stringify(byResourceQuery.data ?? [], null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por CPF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpf} onChange={(event) => setCpf(event.target.value)} placeholder="123.456.789-00" />
              </div>
              <pre className="rounded bg-slate-950 p-4 text-xs text-slate-50 overflow-auto">
                {JSON.stringify(byUserQuery.data ?? [], null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
