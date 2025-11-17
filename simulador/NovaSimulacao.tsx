import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function NovaSimulacao() {
  const [, setLocation] = useLocation();
  const [tipo, setTipo] = useState<"hora_extra" | "premiacao" | "vale_alimentacao">("hora_extra");

  const createMutation = trpc.simulacoes.create.useMutation({
    onSuccess: (data) => {
      toast.success("Simulação criada com sucesso!");
      setLocation(`/simulacoes/${data.simulacaoId}`);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const simulacaoId = `SIM-${Date.now()}`;
    const parametros: any = { tipo };

    if (tipo === "hora_extra") {
      parametros.valorTotalBonificacao = parseFloat(formData.get('valorTotalBonificacao') as string);
    } else if (tipo === "premiacao") {
      parametros.valorPremio = parseFloat(formData.get('valorPremio') as string);
      parametros.premiacaoIncluiEncargos = formData.get('premiacaoIncluiEncargos') === 'on';
    } else if (tipo === "vale_alimentacao") {
      parametros.valorValeAlimentacao = parseFloat(formData.get('valorValeAlimentacao') as string);
      parametros.valeIntegraSalario = formData.get('valeIntegraSalario') === 'on';
    }

    createMutation.mutate({
      simulacaoId,
      nomeDaSimulacao: formData.get('nome') as string,
      parametros
    });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Simulação</h1>
          <p className="text-gray-600 mt-1">Configure os parâmetros da simulação de bonificação</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros da Simulação</CardTitle>
              <CardDescription>Defina o tipo e os valores da bonificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Simulação *</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Bonificação Natal 2024" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Bonificação *</Label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hora_extra">Hora Extra</SelectItem>
                    <SelectItem value="premiacao">Premiação</SelectItem>
                    <SelectItem value="vale_alimentacao">Vale-Alimentação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipo === "hora_extra" && (
                <>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="valorTotalBonificacao">Valor Total da Bonificação (R$) *</Label>
                    <Input id="valorTotalBonificacao" name="valorTotalBonificacao" type="number" step="0.01" required placeholder="Ex: 5000.00" />
                    <p className="text-sm text-gray-500">O sistema calculará automaticamente o custo considerando encargos</p>
                  </div>
                </>
              )}

              {tipo === "premiacao" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="valorPremio">Valor do Prêmio (R$) *</Label>
                    <Input id="valorPremio" name="valorPremio" type="number" step="0.01" required />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="premiacaoIncluiEncargos" name="premiacaoIncluiEncargos" />
                    <Label htmlFor="premiacaoIncluiEncargos">Incluir encargos sobre a premiação</Label>
                  </div>
                </>
              )}

              {tipo === "vale_alimentacao" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="valorValeAlimentacao">Valor do Vale (R$) *</Label>
                    <Input id="valorValeAlimentacao" name="valorValeAlimentacao" type="number" step="0.01" required />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="valeIntegraSalario" name="valeIntegraSalario" />
                    <Label htmlFor="valeIntegraSalario">Vale integra salário</Label>
                  </div>
                </>
              )}

              <div className="pt-4 border-t flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setLocation('/simulacoes')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Processando..." : "Criar Simulação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
