import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { FileDown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function SimulacaoDetalhes() {
  const [, params] = useRoute("/simulacoes/:id");
  const simulacaoId = params?.id || "";

  const { data: simulacao } = trpc.simulacoes.get.useQuery({ simulacaoId });
  const { data: resultados } = trpc.simulacoes.getResultados.useQuery({ simulacaoId });
  const { data: resumo } = trpc.simulacoes.getResumo.useQuery({ simulacaoId });

  const gerarRelatorioMutation = trpc.simulacoes.gerarRelatorioIA.useMutation({
    onSuccess: (data) => {
      if (data.success && data.relatorio) {
        toast.success("Relatório gerado com sucesso!");
        console.log(data.relatorio);
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const exportarExcelMutation = trpc.simulacoes.exportarExcel.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.data), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || 'simulacao.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Excel exportado com sucesso!");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  if (!simulacao || !resultados || !resumo) {
    return (
      <Layout>
        <div className="text-center py-8">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{simulacao.nomeDaSimulacao}</h1>
            <p className="text-gray-600 mt-1">
              Criada em {new Date(simulacao.dataCriacao).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => gerarRelatorioMutation.mutate({ simulacaoId })}>
              <Sparkles className="h-4 w-4 mr-2" />
              Relatório IA
            </Button>
            <Button variant="outline" onClick={() => exportarExcelMutation.mutate({ simulacaoId })}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Totais Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Folha Original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(resumo.totaisGerais.totalFolhaOriginal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Folha com Bonificação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R$ {(resumo.totaisGerais.totalFolhaComBonificacao / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aumento (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {(resumo.totaisGerais.aumentoReais / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aumento (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {resumo.totaisGerais.aumentoPercentual.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo por Equipe */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Equipe</CardTitle>
            <CardDescription>Análise consolidada por equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Funcionários</TableHead>
                  <TableHead>Funções</TableHead>
                  <TableHead className="text-right">Total Bonificações</TableHead>
                  <TableHead className="text-right">Total Folha</TableHead>
                  <TableHead className="text-right">Diferença %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.resumoPorEquipe.map((equipe) => (
                  <TableRow key={equipe.equipe}>
                    <TableCell className="font-medium">{equipe.equipe}</TableCell>
                    <TableCell>{equipe.quantidadeFuncionarios}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {equipe.funcoes.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {(equipe.totalBonificacoes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {(equipe.totalFolhaComBonificacao / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={equipe.diferencaPercentual > 10 ? "destructive" : "default"}>
                        {equipe.diferencaPercentual.toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resultados Detalhados */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados por Funcionário</CardTitle>
            <CardDescription>{resultados.length} funcionário(s) processado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Bonificação</TableHead>
                    <TableHead className="text-right">Encargos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Regra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{res.nome}</TableCell>
                      <TableCell>{res.funcao}</TableCell>
                      <TableCell>{res.equipe}</TableCell>
                      <TableCell className="text-right">
                        R$ {(res.salarioBase / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        R$ {(res.bonusValue / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(res.encargosValue / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(res.totalCost / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {res.regraIdAplicada ? (
                          <Badge variant="outline" className="text-xs">{res.regraIdAplicada}</Badge>
                        ) : (
                          <span className="text-xs text-gray-500">Manual</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
