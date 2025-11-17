import ExcelJS from 'exceljs';
import type { ResultadoSimulacao, Simulacao } from '../drizzle/schema';
import type { ResumoEquipe, TotaisGerais } from './calculoBonificacao';

export async function gerarExcel(
  simulacao: Simulacao,
  resultados: ResultadoSimulacao[],
  resumoPorEquipe: ResumoEquipe[],
  totaisGerais: TotaisGerais
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Aba 1: Parâmetros da Simulação
  const parametrosSheet = workbook.addWorksheet('Parâmetros');
  parametrosSheet.columns = [
    { header: 'Campo', key: 'campo', width: 30 },
    { header: 'Valor', key: 'valor', width: 50 }
  ];

  parametrosSheet.addRows([
    { campo: 'Nome da Simulação', valor: simulacao.nomeDaSimulacao },
    { campo: 'Tipo de Bonificação', valor: simulacao.tipoBonificacao },
    { campo: 'Data de Criação', valor: new Date(simulacao.dataCriacao).toLocaleString('pt-BR') },
    { campo: 'Parâmetros', valor: simulacao.parametrosJson }
  ]);

  // Aba 2: Resultado Detalhado
  const resultadosSheet = workbook.addWorksheet('Resultado Detalhado');
  resultadosSheet.columns = [
    { header: 'ID', key: 'employeeId', width: 15 },
    { header: 'Nome', key: 'nome', width: 30 },
    { header: 'Função', key: 'funcao', width: 20 },
    { header: 'Equipe', key: 'equipe', width: 20 },
    { header: 'Salário Base', key: 'salarioBase', width: 15 },
    { header: 'Bonificação', key: 'bonusValue', width: 15 },
    { header: 'Encargos', key: 'encargosValue', width: 15 },
    { header: 'Total', key: 'totalCost', width: 15 },
    { header: 'Regra Aplicada', key: 'regraIdAplicada', width: 20 }
  ];

  resultados.forEach((res: ResultadoSimulacao) => {
    resultadosSheet.addRow({
      employeeId: res.employeeId,
      nome: res.nome,
      funcao: res.funcao,
      equipe: res.equipe,
      salarioBase: res.salarioBase / 100,
      bonusValue: res.bonusValue / 100,
      encargosValue: res.encargosValue / 100,
      totalCost: res.totalCost / 100,
      regraIdAplicada: res.regraIdAplicada || 'Manual'
    });
  });

  // Formatar colunas de valores como moeda
  ['E', 'F', 'G', 'H'].forEach(col => {
    resultadosSheet.getColumn(col).numFmt = 'R$ #,##0.00';
  });

  // Aba 3: Resumo por Equipe
  const resumoSheet = workbook.addWorksheet('Resumo por Equipe');
  resumoSheet.columns = [
    { header: 'Equipe', key: 'equipe', width: 20 },
    { header: 'Funcionários', key: 'funcionarios', width: 15 },
    { header: 'Funções', key: 'funcoes', width: 40 },
    { header: 'Total Salários', key: 'totalSalarios', width: 15 },
    { header: 'Total Bonificações', key: 'totalBonificacoes', width: 18 },
    { header: 'Total Encargos', key: 'totalEncargos', width: 15 },
    { header: 'Total Folha', key: 'totalFolha', width: 15 },
    { header: 'Diferença %', key: 'diferenca', width: 12 }
  ];

  resumoPorEquipe.forEach((equipe: ResumoEquipe) => {
    resumoSheet.addRow({
      equipe: equipe.equipe,
      funcionarios: equipe.quantidadeFuncionarios,
      funcoes: equipe.funcoes.join(', '),
      totalSalarios: equipe.totalSalarios / 100,
      totalBonificacoes: equipe.totalBonificacoes / 100,
      totalEncargos: equipe.totalEncargos / 100,
      totalFolha: equipe.totalFolhaComBonificacao / 100,
      diferenca: equipe.diferencaPercentual / 100
    });
  });

  ['D', 'E', 'F', 'G'].forEach(col => {
    resumoSheet.getColumn(col).numFmt = 'R$ #,##0.00';
  });
  resumoSheet.getColumn('H').numFmt = '0.00%';

  // Aba 4: Totais Gerais
  const totaisSheet = workbook.addWorksheet('Totais Gerais');
  totaisSheet.columns = [
    { header: 'Métrica', key: 'metrica', width: 30 },
    { header: 'Valor', key: 'valor', width: 20 }
  ];

  totaisSheet.addRows([
    { metrica: 'Folha Original', valor: totaisGerais.totalFolhaOriginal / 100 },
    { metrica: 'Folha com Bonificação', valor: totaisGerais.totalFolhaComBonificacao / 100 },
    { metrica: 'Aumento (R$)', valor: totaisGerais.aumentoReais / 100 },
    { metrica: 'Aumento (%)', valor: totaisGerais.aumentoPercentual / 100 }
  ]);

  totaisSheet.getColumn('B').numFmt = 'R$ #,##0.00';

  // Aplicar estilos aos cabeçalhos
  [parametrosSheet, resultadosSheet, resumoSheet, totaisSheet].forEach(sheet => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
