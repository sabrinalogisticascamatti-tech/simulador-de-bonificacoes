import { invokeLLM } from "./_core/llm";

export interface CSVMappingResult {
  mappings: Record<string, string>; // { csvColumn: expectedField }
  errors: string[];
  warnings: string[];
}

export interface FuncionarioCSVMapping {
  employee_id: string;
  nome: string;
  funcao: string;
  equipe: string;
  salario_base: string;
  horas_padrao_mes?: string;
  encargos_percentuais?: string;
  observacoes?: string;
}

export interface RegraCSVMapping {
  regra_id: string;
  scope_type: string;
  scope_value: string;
  tipo: string;
  metodo: string;
  valor: string;
  data_inicio?: string;
  data_fim?: string;
  ativo?: string;
}

/**
 * Usa IA para mapear colunas de CSV para campos esperados
 */
export async function mapCSVColumnsWithAI(
  headers: string[],
  expectedFields: Record<string, string>,
  sampleRows: string[][]
): Promise<CSVMappingResult> {
  try {
    const prompt = `Você é um assistente especializado em mapeamento de dados CSV.

Campos esperados e suas descrições:
${Object.entries(expectedFields).map(([field, desc]) => `- ${field}: ${desc}`).join('\n')}

Colunas encontradas no CSV:
${headers.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Amostra de dados (primeiras linhas):
${sampleRows.map((row, i) => `Linha ${i + 1}: ${row.join(' | ')}`).join('\n')}

Sua tarefa:
1. Mapear cada coluna do CSV para o campo esperado correspondente
2. Identificar campos obrigatórios ausentes
3. Identificar possíveis erros de formato nos dados
4. Fornecer avisos sobre campos opcionais ausentes

Retorne um JSON com a seguinte estrutura:
{
  "mappings": { "coluna_csv": "campo_esperado" },
  "errors": ["lista de erros críticos"],
  "warnings": ["lista de avisos"]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um assistente especializado em análise e mapeamento de dados CSV." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "csv_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mappings: {
                type: "object",
                description: "Mapeamento de colunas CSV para campos esperados",
                additionalProperties: { type: "string" }
              },
              errors: {
                type: "array",
                description: "Lista de erros críticos encontrados",
                items: { type: "string" }
              },
              warnings: {
                type: "array",
                description: "Lista de avisos",
                items: { type: "string" }
              }
            },
            required: ["mappings", "errors", "warnings"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error("Resposta vazia da IA");
    }

    const result = JSON.parse(content) as CSVMappingResult;
    return result;
  } catch (error) {
    console.error("Erro ao mapear CSV com IA:", error);
    
    // Fallback: mapeamento direto por nome
    const mappings: Record<string, string> = {};
    const errors: string[] = [];
    
    for (const [expectedField, description] of Object.entries(expectedFields)) {
      const matchingHeader = headers.find(h => 
        h.toLowerCase().replace(/[_\s-]/g, '') === expectedField.toLowerCase().replace(/[_\s-]/g, '')
      );
      
      if (matchingHeader) {
        mappings[matchingHeader] = expectedField;
      }
    }
    
    return { mappings, errors, warnings: ["Mapeamento automático por IA falhou, usando mapeamento direto"] };
  }
}

/**
 * Valida e converte valores de funcionário
 */
export function validateFuncionarioRow(row: Record<string, string>): {
  valid: boolean;
  data?: {
    employeeId: string;
    nome: string;
    funcao: string;
    equipe: string;
    salarioBase: number;
    horasPadraoMes: number;
    encargosPercentuais: number;
    observacoes?: string;
  };
  errors: string[];
} {
  const errors: string[] = [];

  // Validar campos obrigatórios
  if (!row.employee_id?.trim()) errors.push("employee_id é obrigatório");
  if (!row.nome?.trim()) errors.push("nome é obrigatório");
  if (!row.funcao?.trim()) errors.push("funcao é obrigatório");
  if (!row.equipe?.trim()) errors.push("equipe é obrigatório");
  if (!row.salario_base?.trim()) errors.push("salario_base é obrigatório");

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Converter e validar números
  const salarioBase = parseFloat(row.salario_base.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
  if (isNaN(salarioBase) || salarioBase <= 0) {
    errors.push("salario_base deve ser um número positivo");
  }

  const horasPadraoMes = row.horas_padrao_mes 
    ? parseInt(row.horas_padrao_mes.replace(/[^\d]/g, '')) 
    : 220;
  
  if (isNaN(horasPadraoMes) || horasPadraoMes <= 0) {
    errors.push("horas_padrao_mes deve ser um número positivo");
  }

  const encargosPercentuais = row.encargos_percentuais 
    ? parseFloat(row.encargos_percentuais.replace(/[^\d,.-]/g, '').replace(',', '.'))
    : 80;
  
  if (isNaN(encargosPercentuais) || encargosPercentuais < 0) {
    errors.push("encargos_percentuais deve ser um número não-negativo");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      employeeId: row.employee_id.trim(),
      nome: row.nome.trim(),
      funcao: row.funcao.trim(),
      equipe: row.equipe.trim(),
      salarioBase: Math.round(salarioBase * 100), // converter para centavos
      horasPadraoMes,
      encargosPercentuais: Math.round(encargosPercentuais * 100), // converter para base 10000
      observacoes: row.observacoes?.trim() || undefined
    },
    errors: []
  };
}

/**
 * Valida e converte valores de regra de bonificação
 */
export function validateRegraRow(row: Record<string, string>): {
  valid: boolean;
  data?: {
    regraId: string;
    scopeType: "individual" | "funcao" | "equipe" | "global";
    scopeValue: string;
    tipo: "hora_extra" | "premiacao" | "vale_alimentacao";
    metodo: "fixo" | "percentual" | "multiplicador_hora";
    valor: number;
    dataInicio?: Date;
    dataFim?: Date;
    ativo: boolean;
  };
  errors: string[];
} {
  const errors: string[] = [];

  // Validar campos obrigatórios
  if (!row.regra_id?.trim()) errors.push("regra_id é obrigatório");
  if (!row.scope_type?.trim()) errors.push("scope_type é obrigatório");
  if (!row.scope_value?.trim()) errors.push("scope_value é obrigatório");
  if (!row.tipo?.trim()) errors.push("tipo é obrigatório");
  if (!row.metodo?.trim()) errors.push("metodo é obrigatório");
  if (!row.valor?.trim()) errors.push("valor é obrigatório");

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validar enums
  const scopeType = row.scope_type.toLowerCase().trim();
  if (!["individual", "funcao", "equipe", "global"].includes(scopeType)) {
    errors.push("scope_type deve ser: individual, funcao, equipe ou global");
  }

  const tipo = row.tipo.toLowerCase().trim();
  if (!["hora_extra", "premiacao", "vale_alimentacao"].includes(tipo)) {
    errors.push("tipo deve ser: hora_extra, premiacao ou vale_alimentacao");
  }

  const metodo = row.metodo.toLowerCase().trim();
  if (!["fixo", "percentual", "multiplicador_hora"].includes(metodo)) {
    errors.push("metodo deve ser: fixo, percentual ou multiplicador_hora");
  }

  // Validar valor
  const valor = parseFloat(row.valor.replace(/[^\d.-]/g, ''));
  if (isNaN(valor) || valor <= 0) {
    errors.push("valor deve ser um número positivo");
  }

  // Validar ativo
  const ativoStr = row.ativo?.toLowerCase().trim() || "true";
  const ativo = ativoStr === "true" || ativoStr === "1" || ativoStr === "sim";

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Converter datas se existirem
  let dataInicio: Date | undefined;
  let dataFim: Date | undefined;

  if (row.data_inicio?.trim()) {
    dataInicio = new Date(row.data_inicio.trim());
    if (isNaN(dataInicio.getTime())) {
      errors.push("data_inicio inválida");
    }
  }

  if (row.data_fim?.trim()) {
    dataFim = new Date(row.data_fim.trim());
    if (isNaN(dataFim.getTime())) {
      errors.push("data_fim inválida");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      regraId: row.regra_id.trim(),
      scopeType: scopeType as any,
      scopeValue: row.scope_value.trim(),
      tipo: tipo as any,
      metodo: metodo as any,
      valor: Math.round(valor * 100), // converter para centavos ou base 10000
      dataInicio,
      dataFim,
      ativo
    },
    errors: []
  };
}
