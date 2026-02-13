import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SignatureHistory } from '@/components/SignatureHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Filter, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditSignature {
  id: number;
  documentName: string;
  documentType: 'contract' | 'aso' | 'pgr';
  signerName: string;
  signerCpf: string;
  signedAt: Date;
  isValid: boolean;
  signatureHash: string;
  ipAddress?: string;
  userAgent?: string;
}

export function SignatureAudit() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contract' | 'aso' | 'pgr'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Mock data - em produção, viria do backend via trpc.auditCpf.getSignatures
  const allSignatures: AuditSignature[] = [
    {
      id: 1,
      documentName: 'Contrato de Trabalho - João Silva',
      documentType: 'contract',
      signerName: 'João da Silva',
      signerCpf: '123.456.789-00',
      signedAt: new Date('2026-02-12T14:30:00'),
      isValid: true,
      signatureHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    {
      id: 2,
      documentName: 'ASO - Admissional - Maria Santos',
      documentType: 'aso',
      signerName: 'Dr. Carlos Alberto',
      signerCpf: '111.222.333-44',
      signedAt: new Date('2026-02-10T10:15:00'),
      isValid: true,
      signatureHash: 'q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      id: 3,
      documentName: 'PGR - Programa de Gestão de Riscos 2026',
      documentType: 'pgr',
      signerName: 'Gestor de Segurança',
      signerCpf: '555.666.777-88',
      signedAt: new Date('2026-02-08T09:00:00'),
      isValid: true,
      signatureHash: 'z1x2c3v4b5n6m7a8s9d0f1g2h3j4k5l6',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    },
  ];

  // Filtrar assinaturas
  const filteredSignatures = allSignatures.filter(sig => {
    const matchesSearch =
      sig.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sig.signerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sig.signerCpf.includes(searchTerm);

    const matchesType = filterType === 'all' || sig.documentType === filterType;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'valid' && sig.isValid) ||
      (filterStatus === 'invalid' && !sig.isValid);

    const signatureDate = sig.signedAt;
    const matchesDateFrom = !dateFrom || signatureDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || signatureDate <= new Date(dateTo);

    return matchesSearch && matchesType && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleExportAudit = () => {
    // Gerar CSV com auditoria
    const csv = [
      ['ID', 'Documento', 'Tipo', 'Assinante', 'CPF', 'Data/Hora', 'Status', 'IP', 'Hash'].join(','),
      ...filteredSignatures.map(sig =>
        [
          sig.id,
          `"${sig.documentName}"`,
          sig.documentType,
          `"${sig.signerName}"`,
          sig.signerCpf,
          sig.signedAt.toLocaleString('pt-BR'),
          sig.isValid ? 'Válida' : 'Inválida',
          sig.ipAddress || 'N/A',
          sig.signatureHash,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-assinaturas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria de Assinaturas</h1>
            <p className="text-muted-foreground mt-2">
              Consulte histórico completo de assinaturas digitais com rastreabilidade por CPF
            </p>
          </div>
          <Button onClick={handleExportAudit} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Documento, assinante ou CPF"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Documento</label>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="contract">📋 Contrato</SelectItem>
                    <SelectItem value="aso">🏥 ASO</SelectItem>
                    <SelectItem value="pgr">⚠️ PGR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="valid">✓ Válida</SelectItem>
                    <SelectItem value="invalid">✗ Inválida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{filteredSignatures.length}</p>
                <p className="text-sm text-muted-foreground">Assinaturas Encontradas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {filteredSignatures.filter(s => s.isValid).length}
                </p>
                <p className="text-sm text-muted-foreground">Válidas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {filteredSignatures.filter(s => !s.isValid).length}
                </p>
                <p className="text-sm text-muted-foreground">Inválidas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {new Set(filteredSignatures.map(s => s.signerCpf)).size}
                </p>
                <p className="text-sm text-muted-foreground">Assinantes Únicos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signature History */}
        <SignatureHistory
          signatures={filteredSignatures}
          onViewDetails={sig => {
            console.log('Ver detalhes:', sig);
            // Implementar modal de detalhes
          }}
          onDownload={sig => {
            console.log('Download:', sig);
            // Implementar download de certificado
          }}
        />

        {/* LGPD Compliance Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>🔒 Conformidade LGPD:</strong> Todos os dados de assinatura são armazenados com
              rastreabilidade completa (quem, quando, onde, o quê). Os dados pessoais (CPF, nome, email) são
              protegidos conforme Lei Geral de Proteção de Dados. Você pode solicitar acesso, correção ou
              exclusão de seus dados a qualquer momento.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
