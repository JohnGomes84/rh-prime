$ErrorActionPreference = "Stop"

Write-Host "Validando integracoes do RH Prime..."

$matches = rg -n "em desenvolvimento|Mock data|Sincronize com o servidor" client/src/pages client/src/components 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Ainda existem mocks ou fluxos incompletos no front"
  Write-Host $matches
  exit 1
}

$hookUsage = rg -n "useDigitalSignature" client/src --glob "*.tsx" 2>$null | Select-String -NotMatch "useDigitalSignature.ts"
if ($hookUsage) {
  Write-Host "Hook useDigitalSignature esta sendo usado"
} else {
  Write-Host "Hook useDigitalSignature pode estar orfao"
}

$routes = @(
  "templates",
  "recrutamento",
  "horas-extras",
  "folha",
  "holerite",
  "avaliacoes",
  "usuarios",
  "seguranca-config",
  "assinar-contratos",
  "assinar-asos",
  "auditoria-assinaturas",
  "hierarquia",
  "auditoria-geral",
  "admin/recursos"
)

foreach ($route in $routes) {
  $routeMatch = Select-String -Path "client/src/components/DashboardLayout.tsx" -Pattern "path: `"/$route`"" -Quiet
  if (-not $routeMatch) {
    Write-Host "Rota /$route nao esta no menu lateral"
    exit 1
  }
}

Write-Host "Validacao basica concluida."
