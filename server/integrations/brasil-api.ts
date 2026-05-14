const DEFAULT_TIMEOUT_MS = 10000;

async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "rh-prime/1.0 (+https://public-self-eight.vercel.app)",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const sanitizeDigits = (value: string) => value.replace(/\D/g, "");

export interface CepInfo {
  cep: string;
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  ibgeCode?: string;
}

export async function lookupCep(rawCep: string): Promise<CepInfo | null> {
  const cep = sanitizeDigits(rawCep);
  if (cep.length !== 8) return null;
  try {
    const data = await fetchJson<{
      cep?: string;
      logradouro?: string;
      complemento?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      ibge?: string;
      erro?: boolean;
    }>(`https://viacep.com.br/ws/${cep}/json/`);
    if (data.erro || !data.cep) return null;
    return {
      cep: data.cep,
      street: data.logradouro ?? "",
      complement: data.complemento || undefined,
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
      ibgeCode: data.ibge || undefined,
    };
  } catch {
    try {
      const data = await fetchJson<{
        cep: string;
        street: string;
        neighborhood: string;
        city: string;
        state: string;
      }>(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      return {
        cep: data.cep,
        street: data.street ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      };
    } catch {
      return null;
    }
  }
}

export interface CnpjInfo {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cnaePrincipal?: { code: string; description: string };
  porte?: string;
  capitalSocial?: number;
  dataAbertura?: string;
}

function mapBrasilApi(data: any): CnpjInfo | null {
  if (!data?.cnpj) return null;
  return {
    cnpj: data.cnpj,
    razaoSocial: data.razao_social ?? "",
    nomeFantasia: data.nome_fantasia || undefined,
    situacao: data.descricao_situacao_cadastral || undefined,
    email: data.email || undefined,
    telefone: data.ddd_telefone_1 || undefined,
    cep: data.cep || undefined,
    street: data.logradouro || undefined,
    number: data.numero || undefined,
    complement: data.complemento || undefined,
    neighborhood: data.bairro || undefined,
    city: data.municipio || undefined,
    state: data.uf || undefined,
    cnaePrincipal: data.cnae_fiscal
      ? { code: String(data.cnae_fiscal), description: data.cnae_fiscal_descricao ?? "" }
      : undefined,
    porte: data.porte || undefined,
    capitalSocial: typeof data.capital_social === "number" ? data.capital_social : undefined,
    dataAbertura: data.data_inicio_atividade || undefined,
  };
}

function mapReceitaWs(data: any): CnpjInfo | null {
  if (!data || data.status === "ERROR" || !data.cnpj) return null;
  const cnpjDigits = sanitizeDigits(String(data.cnpj));
  return {
    cnpj: cnpjDigits,
    razaoSocial: data.nome ?? "",
    nomeFantasia: data.fantasia || undefined,
    situacao: data.situacao || undefined,
    email: data.email || undefined,
    telefone: data.telefone || undefined,
    cep: data.cep ? sanitizeDigits(data.cep) : undefined,
    street: data.logradouro || undefined,
    number: data.numero || undefined,
    complement: data.complemento || undefined,
    neighborhood: data.bairro || undefined,
    city: data.municipio || undefined,
    state: data.uf || undefined,
    cnaePrincipal: data.atividade_principal?.[0]
      ? {
          code: String(data.atividade_principal[0].code ?? ""),
          description: data.atividade_principal[0].text ?? "",
        }
      : undefined,
    porte: data.porte || undefined,
    capitalSocial: data.capital_social
      ? Number(String(data.capital_social).replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", "."))
      : undefined,
    dataAbertura: data.abertura || undefined,
  };
}

export async function lookupCnpj(rawCnpj: string): Promise<CnpjInfo | null> {
  const cnpj = sanitizeDigits(rawCnpj);
  if (cnpj.length !== 14) return null;

  try {
    const data = await fetchJson<any>(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    const mapped = mapBrasilApi(data);
    if (mapped) return mapped;
    console.warn("[lookupCnpj] brasilapi vazio para", cnpj);
  } catch (err) {
    console.warn("[lookupCnpj] brasilapi falhou:", (err as Error).message);
  }

  try {
    const data = await fetchJson<any>(`https://receitaws.com.br/v1/cnpj/${cnpj}`, 12000);
    const mapped = mapReceitaWs(data);
    if (mapped) return mapped;
    console.warn("[lookupCnpj] receitaws vazio para", cnpj);
  } catch (err) {
    console.warn("[lookupCnpj] receitaws falhou:", (err as Error).message);
  }

  return null;
}

export interface Holiday {
  date: string;
  name: string;
  type: string;
}

export async function listHolidays(year: number): Promise<Holiday[]> {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return [];
  try {
    const data = await fetchJson<Array<{ date: string; name: string; type: string }>>(
      `https://brasilapi.com.br/api/feriados/v1/${year}`
    );
    return data.map((h) => ({ date: h.date, name: h.name, type: h.type }));
  } catch {
    return [];
  }
}

export interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
  regiao: { id: number; sigla: string; nome: string };
}

export interface IbgeCity {
  id: number;
  nome: string;
}

export async function listStates(): Promise<IbgeState[]> {
  try {
    return await fetchJson<IbgeState[]>(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
    );
  } catch {
    return [];
  }
}

export async function listCitiesByState(uf: string): Promise<IbgeCity[]> {
  const sigla = uf.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(sigla)) return [];
  try {
    const data = await fetchJson<Array<{ id: number; nome: string }>>(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`
    );
    return data.map((c) => ({ id: c.id, nome: c.nome }));
  } catch {
    return [];
  }
}
