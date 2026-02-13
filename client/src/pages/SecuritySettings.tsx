import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Lock, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export function SecuritySettings() {
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expirationDays: 90,
  });

  const [sessionPolicy, setSessionPolicy] = useState({
    timeoutMinutes: 30,
    maxSessions: 3,
    rememberMe: true,
  });

  const [loginPolicy, setLoginPolicy] = useState({
    maxAttempts: 5,
    lockoutMinutes: 15,
    requireTwoFactor: false,
  });

  const [auditPolicy, setAuditPolicy] = useState({
    retentionDays: 90,
    logAllOperations: true,
    logFailedLogins: true,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Configurações de Segurança</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie políticas de segurança, senhas e auditoria do sistema
          </p>
        </div>

        {/* Security Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold">Sistema Seguro</p>
                  <p className="text-sm text-muted-foreground">Todas as políticas ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Nível de Segurança</p>
                  <p className="text-sm text-muted-foreground">Alto</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="font-semibold">Última Auditoria</p>
                  <p className="text-sm text-muted-foreground">Hoje às 10:30</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Política de Senhas
            </CardTitle>
            <CardDescription>
              Configure requisitos de força e expiração de senhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Min Length */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Comprimento Mínimo</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="8"
                    max="32"
                    value={passwordPolicy.minLength}
                    onChange={e =>
                      setPasswordPolicy({
                        ...passwordPolicy,
                        minLength: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">caracteres</span>
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiração de Senha</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="30"
                    max="365"
                    value={passwordPolicy.expirationDays}
                    onChange={e =>
                      setPasswordPolicy({
                        ...passwordPolicy,
                        expirationDays: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </div>

              {/* Uppercase */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exigir Letras Maiúsculas</label>
                <Switch
                  checked={passwordPolicy.requireUppercase}
                  onCheckedChange={checked =>
                    setPasswordPolicy({
                      ...passwordPolicy,
                      requireUppercase: checked,
                    })
                  }
                />
              </div>

              {/* Numbers */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exigir Números</label>
                <Switch
                  checked={passwordPolicy.requireNumbers}
                  onCheckedChange={checked =>
                    setPasswordPolicy({
                      ...passwordPolicy,
                      requireNumbers: checked,
                    })
                  }
                />
              </div>

              {/* Special Chars */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exigir Caracteres Especiais</label>
                <Switch
                  checked={passwordPolicy.requireSpecialChars}
                  onCheckedChange={checked =>
                    setPasswordPolicy({
                      ...passwordPolicy,
                      requireSpecialChars: checked,
                    })
                  }
                />
              </div>
            </div>

            <Button>Salvar Política de Senhas</Button>
          </CardContent>
        </Card>

        {/* Login Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Política de Login
            </CardTitle>
            <CardDescription>
              Configure tentativas de login e bloqueios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Attempts */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Máximo de Tentativas Falhas</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={loginPolicy.maxAttempts}
                  onChange={e =>
                    setLoginPolicy({
                      ...loginPolicy,
                      maxAttempts: parseInt(e.target.value),
                    })
                  }
                  className="w-20"
                />
              </div>

              {/* Lockout Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duração do Bloqueio</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={loginPolicy.lockoutMinutes}
                    onChange={e =>
                      setLoginPolicy({
                        ...loginPolicy,
                        lockoutMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>

              {/* Two Factor */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exigir Autenticação de Dois Fatores</label>
                <Switch
                  checked={loginPolicy.requireTwoFactor}
                  onCheckedChange={checked =>
                    setLoginPolicy({
                      ...loginPolicy,
                      requireTwoFactor: checked,
                    })
                  }
                />
              </div>
            </div>

            <Button>Salvar Política de Login</Button>
          </CardContent>
        </Card>

        {/* Session Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Política de Sessão</CardTitle>
            <CardDescription>
              Configure timeouts e limites de sessão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timeout */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout de Inatividade</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="480"
                    value={sessionPolicy.timeoutMinutes}
                    onChange={e =>
                      setSessionPolicy({
                        ...sessionPolicy,
                        timeoutMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>

              {/* Max Sessions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Máximo de Sessões por Usuário</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={sessionPolicy.maxSessions}
                  onChange={e =>
                    setSessionPolicy({
                      ...sessionPolicy,
                      maxSessions: parseInt(e.target.value),
                    })
                  }
                  className="w-20"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permitir "Lembrar-me"</label>
                <Switch
                  checked={sessionPolicy.rememberMe}
                  onCheckedChange={checked =>
                    setSessionPolicy({
                      ...sessionPolicy,
                      rememberMe: checked,
                    })
                  }
                />
              </div>
            </div>

            <Button>Salvar Política de Sessão</Button>
          </CardContent>
        </Card>

        {/* Audit Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Política de Auditoria</CardTitle>
            <CardDescription>
              Configure retenção e logging de auditoria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Retention */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Retenção de Logs</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="30"
                    max="730"
                    value={auditPolicy.retentionDays}
                    onChange={e =>
                      setAuditPolicy({
                        ...auditPolicy,
                        retentionDays: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </div>

              {/* Log All Operations */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Registrar Todas as Operações</label>
                <Switch
                  checked={auditPolicy.logAllOperations}
                  onCheckedChange={checked =>
                    setAuditPolicy({
                      ...auditPolicy,
                      logAllOperations: checked,
                    })
                  }
                />
              </div>

              {/* Log Failed Logins */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Registrar Logins Falhados</label>
                <Switch
                  checked={auditPolicy.logFailedLogins}
                  onCheckedChange={checked =>
                    setAuditPolicy({
                      ...auditPolicy,
                      logFailedLogins: checked,
                    })
                  }
                />
              </div>
            </div>

            <Button>Salvar Política de Auditoria</Button>
          </CardContent>
        </Card>

        {/* LGPD Compliance */}
        <Alert className="bg-blue-50 border-blue-200">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Conformidade LGPD:</strong> Todas as políticas de segurança estão em conformidade
            com a Lei Geral de Proteção de Dados. Os logs são retidos apenas pelo período configurado
            e podem ser exportados ou deletados a qualquer momento conforme solicitação do usuário.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
