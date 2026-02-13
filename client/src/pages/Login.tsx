import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Login() {
  const handleOAuthLogin = () => {
    window.location.href = `/api/oauth/authorize?redirect_uri=${window.location.origin}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">🛡️</span>
            </div>
          </div>
          <CardTitle className="text-2xl">RH Prime</CardTitle>
          <CardDescription className="text-blue-100">
            Sistema de Gestão de Recursos Humanos
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Acesse o sistema com sua conta Manus
            </p>

            <Button
              onClick={handleOAuthLogin}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
            >
              <span className="text-lg">🔐</span>
              Entrar com Manus OAuth
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-900">
              Segurança
            </p>
            <p className="text-xs text-blue-800">
              Autenticação segura delegada ao provedor Manus. Seus dados estão protegidos.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-600">
        <p>© 2026 ML Serviços. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
