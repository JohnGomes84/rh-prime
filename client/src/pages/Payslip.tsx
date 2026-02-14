import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Download, FileText } from 'lucide-react';

export function Payslip() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleDownloadPDF = () => {
    alert('Funcionalidade de download em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Holerite</h1>
        <p className="text-muted-foreground mt-2">Visualize e baixe seus holerites</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Mês</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Buscar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslip Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Holerite - {months.find((m) => m.value === selectedMonth)?.label} / {selectedYear}
          </CardTitle>
          <CardDescription>Exemplo de holerite com detalhamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h3 className="font-bold text-lg">EMPRESA LTDA</h3>
            <p className="text-sm text-muted-foreground">CNPJ: 00.000.000/0000-00</p>
            <p className="text-sm text-muted-foreground">Período: 01 a 30 de {months.find((m) => m.value === selectedMonth)?.label.toLowerCase()} de {selectedYear}</p>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">Funcionário</p>
              <p className="font-semibold">{user?.name || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-semibold">***.***.***-**</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matrícula</p>
              <p className="font-semibold">0001</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cargo</p>
              <p className="font-semibold">Desenvolvedor</p>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h4 className="font-bold mb-3">PROVENTOS (Ganhos)</h4>
            <div className="space-y-2 border-b pb-3">
              <div className="flex justify-between">
                <span>Salário Base</span>
                <span>R$ 5.000,00</span>
              </div>
              <div className="flex justify-between">
                <span>Adicionais</span>
                <span>R$ 500,00</span>
              </div>
              <div className="flex justify-between text-blue-600 font-semibold">
                <span>Horas Extras (10h x 100%)</span>
                <span>R$ 227,27</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total de Proventos</span>
                <span>R$ 5.727,27</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="font-bold mb-3">DESCONTOS</h4>
            <div className="space-y-2 border-b pb-3">
              <div className="flex justify-between">
                <span>INSS (14%)</span>
                <span>-R$ 700,00</span>
              </div>
              <div className="flex justify-between">
                <span>Imposto de Renda (15%)</span>
                <span>-R$ 559,84</span>
              </div>
              <div className="flex justify-between">
                <span>Outros Descontos</span>
                <span>-R$ 100,00</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total de Descontos</span>
                <span>-R$ 1.359,84</span>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">SALÁRIO LÍQUIDO</span>
              <span className="font-bold text-2xl text-green-600">R$ 4.367,43</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">FGTS (8%)</p>
              <p className="font-semibold">R$ 400,00</p>
            </div>
            <div>
              <p className="text-muted-foreground">Base INSS</p>
              <p className="font-semibold">R$ 5.000,00</p>
            </div>
          </div>

          {/* Download Button */}
          <Button onClick={handleDownloadPDF} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
