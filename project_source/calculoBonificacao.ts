import type { Funcionario, RegraBonificacao } from "../drizzle/schema";

export interface ParametrosSimulacao {
  tipo: "hora_extra" | "premiacao" | "vale_alimentacao";
  valorTotalBonificacao?: number;
  valorPremio?: number;
  percentualPremio?: number;
  valorValeAlimentacao?: number;
  valeIntegraSalario?: boolean;
  premiacaoIncluiEncargos?: boolean;
}

export interface ResultadoCalculo {
  employeeId: string;
  nome: string;
  funcao: string;
  equipe: string;
  salarioBase: number;
  bonusValue: number;
  encargosValue: number;
  totalCost: number;
  regraIdAplicada: string | null;
}

/**
 * Calcula bonificação como hora extra
 */
function calcularHoraExtra(
  funcionario: Funcionario,
  regra: RegraBonificacao | null,
  params: ParametrosSimulacao
): { bonusValue: number; encargosValue: number; totalCost: number } {
  let bonusValue = 0;
  
  if (params.valorTotalBonificacao) {
    // Usar valor total especificado (já em reais, converter para centavos)
    bonusValue = Math.round(params.valorTotalBonificacao * 100);
  } else if (regra) {
    // Aplicar regra se existir
    if (regra.metodo === "fixo") {
      bonusValue = regra.valor;
    } else if (regra.metodo === "percentual") {
      bonusValue = Math.round(funcionario.salarioBase * (regra.valor / 10000));
    }
  }
  
  // Encargos sobre salário + bonus
  const encargosValue = Math.round(
    (funcionario.salarioBase + bonusValue) * (funcionario.encargosPercentuais / 10000)
  );
  
  const totalCost = funcionario.salarioBase + bonusValue + encargosValue;
  
  return { bonusValue, encargosValue, totalCost };
}

/**
 * Calcula bonificação como premiação
 */
function calcularPremiacao(
  funcionario: Funcionario,
  regra: RegraBonificacao | null,
  params: ParametrosSimulacao
): { bonusValue: number; encargosValue: number; totalCost: number } {
  let bonusValue = 0;
  
  if (regra) {
    if (regra.metodo === "fixo") {
      bonusValue = regra.valor; // já está em centavos
    } else if (regra.metodo === "percentual") {
      bonusValue = Math.round(funcionario.salarioBase * (regra.valor / 10000));
    }
  } else {
    // Usar parâmetros manuais
    if (params.valorPremio) {
      bonusValue = Math.round(params.valorPremio * 100); // converter para centavos
    } else if (params.percentualPremio) {
      bonusValue = Math.round(funcionario.salarioBase * (params.percentualPremio / 100));
    }
  }
  
  // Calcular encargos
  let encargosValue = 0;
  if (params.premiacaoIncluiEncargos) {
    encargosValue = Math.round(
      (funcionario.salarioBase + bonusValue) * (funcionario.encargosPercentuais / 10000)
    );
  } else {
    encargosValue = Math.round(
      funcionario.salarioBase * (funcionario.encargosPercentuais / 10000)
    );
  }
  
  const totalCost = funcionario.salarioBase + bonusValue + encargosValue;
  
  return { bonusValue, encargosValue, totalCost };
}

/**
 * Calcula bonificação como vale-alimentação
 */
function calcularValeAlimentacao(
  funcionario: Funcionario,
  regra: RegraBonificacao | null,
  params: ParametrosSimulacao
): { bonusValue: number; encargosValue: number; totalCost: number } {
  let bonusValue = 0;
  
  if (regra && regra.metodo === "fixo") {
    bonusValue = regra.valor; // já está em centavos
  } else if (params.valorValeAlimentacao) {
    bonusValue = Math.round(params.valorValeAlimentacao * 100); // converter para centavos
  }
  
  // Calcular encargos
  let encargosValue = 0;
  if (params.valeIntegraSalario) {
    encargosValue = Math.round(
      (funcionario.salarioBase + bonusValue) * (funcionario.encargosPercentuais / 10000)
    );
  } else {
    encargosValue = Math.round(
      funcionario.salarioBase * (funcionario.encargosPercentuais / 10000)
    );
  }
  
  const totalCost = funcionario.salarioBase + bonusValue + encargosValue;
  
  return { bonusValue, encargosValue, totalCost };
}

/**
 * Calcula bonificação para um funcionário
 */
export function calcularBonificacao(
  funcionario: Funcionario,
  regra: RegraBonificacao | null,
  params: ParametrosSimulacao
): ResultadoCalculo {
  let resultado: { bonusValue: number; encargosValue: number; totalCost: number };
  
  switch (params.tipo) {
    case "hora_extra":
      resultado = calcularHoraExtra(funcionario, regra, params);
      break;
    case "premiacao":
      resultado = calcularPremiacao(funcionario, regra, params);
      break;
    case "vale_alimentacao":
      resultado = calcularValeAlimentacao(funcionario, regra, params);
      break;
    default:
      throw new Error(`Tipo de bonificação inválido: ${params.tipo}`);
  }
  
  return {
    employeeId: funcionario.employeeId,
    nome: funcionario.nome,
    funcao: funcionario.funcao,
    equipe: funcionario.equipe,
    salarioBase: funcionario.salarioBase,
    bonusValue: resultado.bonusValue,
    encargosValue: resultado.encargosValue,
    totalCost: resultado.totalCost,
    regraIdAplicada: regra?.regraId || null
  };
}

/**
 * Calcula resumo por equipe
 */
export interface ResumoEquipe {
  equipe: string;
  funcoes: string[];
  quantidadeFuncionarios: number;
  totalSalarios: number;
  totalBonificacoes: number;
  totalEncargos: number;
  totalFolhaComBonificacao: number;
  diferencaPercentual: number;
}

export function calcularResumoPorEquipe(resultados: ResultadoCalculo[]): ResumoEquipe[] {
  const equipes = new Map<string, ResultadoCalculo[]>();
  
  // Agrupar por equipe
  for (const resultado of resultados) {
    if (!equipes.has(resultado.equipe)) {
      equipes.set(resultado.equipe, []);
    }
    equipes.get(resultado.equipe)!.push(resultado);
  }
  
  // Calcular resumo para cada equipe
  const resumos: ResumoEquipe[] = [];
  
  for (const [equipe, resultadosEquipe] of Array.from(equipes.entries())) {
    const funcoes = Array.from(new Set(resultadosEquipe.map((r: ResultadoCalculo) => r.funcao)));
    const quantidadeFuncionarios = resultadosEquipe.length;
    const totalSalarios = resultadosEquipe.reduce((sum: number, r: ResultadoCalculo) => sum + r.salarioBase, 0);
    const totalBonificacoes = resultadosEquipe.reduce((sum: number, r: ResultadoCalculo) => sum + r.bonusValue, 0);
    const totalEncargos = resultadosEquipe.reduce((sum: number, r: ResultadoCalculo) => sum + r.encargosValue, 0);
    const totalFolhaComBonificacao = resultadosEquipe.reduce((sum: number, r: ResultadoCalculo) => sum + r.totalCost, 0);
    
    const folhaOriginal = totalSalarios + (totalEncargos - totalBonificacoes * 0.8); // aproximação
    const diferencaPercentual = folhaOriginal > 0 
      ? ((totalFolhaComBonificacao - folhaOriginal) / folhaOriginal) * 100 
      : 0;
    
    resumos.push({
      equipe,
      funcoes,
      quantidadeFuncionarios,
      totalSalarios,
      totalBonificacoes,
      totalEncargos,
      totalFolhaComBonificacao,
      diferencaPercentual
    });
  }
  
  return resumos.sort((a, b) => a.equipe.localeCompare(b.equipe));
}

/**
 * Calcula totais gerais
 */
export interface TotaisGerais {
  totalFolhaOriginal: number;
  totalFolhaComBonificacao: number;
  aumentoReais: number;
  aumentoPercentual: number;
}

export function calcularTotaisGerais(resultados: ResultadoCalculo[]): TotaisGerais {
  const totalSalarios = resultados.reduce((sum: number, r: ResultadoCalculo) => sum + r.salarioBase, 0);
  const totalBonificacoes = resultados.reduce((sum: number, r: ResultadoCalculo) => sum + r.bonusValue, 0);
  const totalEncargos = resultados.reduce((sum: number, r: ResultadoCalculo) => sum + r.encargosValue, 0);
  const totalFolhaComBonificacao = resultados.reduce((sum: number, r: ResultadoCalculo) => sum + r.totalCost, 0);
  
  // Calcular folha original (sem bonificação)
  const encargosOriginais = resultados.reduce((sum: number, r: ResultadoCalculo) => {
    const encargosPerc = r.encargosValue / (r.salarioBase + r.bonusValue);
    return sum + (r.salarioBase * encargosPerc);
  }, 0);
  
  const totalFolhaOriginal = totalSalarios + encargosOriginais;
  const aumentoReais = totalFolhaComBonificacao - totalFolhaOriginal;
  const aumentoPercentual = totalFolhaOriginal > 0 
    ? (aumentoReais / totalFolhaOriginal) * 100 
    : 0;
  
  return {
    totalFolhaOriginal: Math.round(totalFolhaOriginal),
    totalFolhaComBonificacao: Math.round(totalFolhaComBonificacao),
    aumentoReais: Math.round(aumentoReais),
    aumentoPercentual
  };
}
