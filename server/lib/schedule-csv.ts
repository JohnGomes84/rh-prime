export type ScheduleCsvRow = {
  date: string;
  client: string;
  shift?: string;
  unit?: string;
  leader?: string;
  notes?: string;
};

const HEADER_ALIASES: Record<string, keyof ScheduleCsvRow> = {
  data: "date",
  date: "date",
  cliente: "client",
  client: "client",
  turno: "shift",
  shift: "shift",
  unidade: "unit",
  unit: "unit",
  local: "unit",
  lider: "leader",
  leader: "leader",
  observacoes: "notes",
  observacao: "notes",
  notes: "notes",
};

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function detectCsvDelimiter(csvContent: string) {
  const firstLine = csvContent.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

export function parseScheduleCsv(csvContent: string) {
  const normalizedContent = csvContent.replace(/^\uFEFF/, "").trim();
  if (!normalizedContent) return [];

  const delimiter = detectCsvDelimiter(normalizedContent);
  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0], delimiter).map((header) => {
    const key = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return HEADER_ALIASES[key];
  });

  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line, delimiter);
    const row = {} as ScheduleCsvRow;

    headers.forEach((header, cellIndex) => {
      if (!header) return;
      const value = cells[cellIndex]?.trim();
      if (!value) return;
      row[header] = value;
    });

    if (!row.date || !row.client) {
      throw new Error(`Linha ${rowIndex + 2}: campos obrigatorios ausentes (data, cliente)`);
    }

    return row;
  });
}
