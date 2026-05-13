#!/bin/bash
echo "Validando integracoes do RH Prime..."

if grep -R -nE "em desenvolvimento|Mock data|Sincronize com o servidor" client/src/pages/; then
  echo "Ainda existem mocks ou fluxos incompletos no front"
  exit 1
fi

if grep -r "useDigitalSignature" client/src --include="*.tsx" | grep -v "useDigitalSignature.ts" | grep -q "import"; then
  echo "Hook useDigitalSignature esta sendo usado"
else
  echo "Hook useDigitalSignature pode estar orfao"
fi

for route in templates recrutamento horas-extras folha holerite avaliacoes usuarios seguranca-config assinar-contratos assinar-asos auditoria-assinaturas hierarquia auditoria-geral admin/recursos; do
  if ! grep -q "path: \"/$route\"" client/src/components/DashboardLayout.tsx; then
    echo "Rota /$route nao esta no menu lateral"
    exit 1
  fi
done

echo "Validacao basica concluida."
