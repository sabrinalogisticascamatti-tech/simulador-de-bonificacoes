import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Upload, Plus, Trash2, Download } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

export default function Regras() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [tipo, setTipo] = useState<"hora_extra" | "premiacao" | "vale_alimentacao">("hora_extra");
  const [scopeType, setScopeType] = useState<"individual" | "funcao" | "equipe" | "global">("funcao");
  const [metodo, setMetodo] = useState<"fixo" | "percentual" | "multiplicador_hora">("fixo");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: regras, isLoading } = trpc.regras.list.useQuery();

  const deleteMutation = trpc.regras.delete.useMutation({
    onSuccess: () => {
      utils.regras.list.invalidate();
      toast.success("Regra excluída com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const createMutation = trpc.regras.create.useMutation({
    onSuccess: () => {
      utils.regras.list.invalidate();
      setShowAddDialog(false);
      toast.success("Regra criada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    }
  });

  const importMutation = trpc.regras.importCSV.useMutation({
    onSuccess: (data) => {
      utils.regras.list.invalidate();
      setShowImportDialog(false);
      toast.success(`${data.imported} regras importadas com sucesso`);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} erros encontrados`);
      }
    },
    onError: (error) => {
      toast.error(`Erro na importação: ${error.message}`);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data.map((row: any) => 
          headers.map(h => row[h] || '')
        );

        importMutation.mutate({
          csvContent: '',
          headers,
          rows
        });
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    });
  };

  const handleAddRegra = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const valorRaw = parseFloat(formData.get('valor') as string);
    const valorCents = metodo === "percentual" 
      ? Math.round(valorRaw * 100) 
      : Math.round(valorRaw * 100);

    createMutation.mutate({
      regraId: formData.get('regraId') as string,
      tipo,
      scopeType,
      scopeValue: formData.get('scopeValue') as string,
      metodo,
      valor: valorCents,
      ativo: formData.get('ativo') === 'on'
    });
  };

  const getScopeLabel = (scopeType: string) => {
    const labels: Record<string, string> = {
      individual: "Individual",
      funcao: "Função",
      equipe: "Equipe",
      global: "Global"
    };
    return labels[scopeType] || scopeType;
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      hora_extra: "Hora Extra",
      premiacao: "Premiação",
      vale_alimentacao: "Vale-Alimentação"
    };
    return labels[tipo] || tipo;
  };

  const getMetodoLabel = (metodo: string) => {
    const labels: Record<string, string> = {
      fixo: "Fixo",
      percentual: "Percentual",
      multiplicador_hora: "Multiplicador"
    };
    return labels[metodo] || metodo;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Regras de Bonificação</h1>
            <p className="text-gray-600 mt-1">Configure regras por função, equipe ou funcionário</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" asChild>
              <a href="/template_regras.csv" download="template_regras.csv">
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </a>
            </Button>
            
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Regras via CSV</DialogTitle>
                  <DialogDescription>
                    Selecione um arquivo CSV com as regras de bonificação
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={importMutation.isPending}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Regra de Bonificação</DialogTitle>
                  <DialogDescription>
                    Configure uma nova regra de bonificação
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddRegra}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="regraId">ID da Regra *</Label>
                      <Input id="regraId" name="regraId" required placeholder="Ex: REGRA001" />
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

                    <div className="space-y-2">
                      <Label htmlFor="scopeType">Escopo *</Label>
                      <Select value={scopeType} onValueChange={(v: any) => setScopeType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="funcao">Função</SelectItem>
                          <SelectItem value="equipe">Equipe</SelectItem>
                          <SelectItem value="global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="scopeValue">Valor do Escopo *</Label>
                      <Input 
                        id="scopeValue" 
                        name="scopeValue" 
                        required 
                        placeholder={
                          scopeType === "individual" ? "Ex: EMP001" :
                          scopeType === "funcao" ? "Ex: Desenvolvedor" :
                          scopeType === "equipe" ? "Ex: TI" :
                          "*"
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metodo">Método de Cálculo *</Label>
                      <Select value={metodo} onValueChange={(v: any) => setMetodo(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                          <SelectItem value="percentual">Percentual (%)</SelectItem>
                          <SelectItem value="multiplicador_hora">Multiplicador de Hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor">
                        Valor * {metodo === "percentual" ? "(%)" : metodo === "fixo" ? "(R$)" : "(multiplicador)"}
                      </Label>
                      <Input 
                        id="valor" 
                        name="valor" 
                        type="number" 
                        step="0.01" 
                        required 
                        placeholder={metodo === "percentual" ? "Ex: 10" : metodo === "fixo" ? "Ex: 500" : "Ex: 1.5"}
                      />
                    </div>

                    <div className="flex items-center space-x-2 col-span-2">
                      <Switch id="ativo" name="ativo" defaultChecked />
                      <Label htmlFor="ativo">Regra ativa</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Salvando..." : "Salvar Regra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Carregando...</div>
          ) : regras && regras.length > 0 ? (
            regras.map((regra) => (
              <Card key={regra.id} className={!regra.ativo ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{regra.regraId}</CardTitle>
                      <CardDescription>{getTipoLabel(regra.tipo)}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ regraId: regra.regraId })}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Escopo:</span>
                    <Badge variant="outline">{getScopeLabel(regra.scopeType)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valor:</span>
                    <span className="font-medium">{regra.scopeValue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Método:</span>
                    <Badge>{getMetodoLabel(regra.metodo)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valor:</span>
                    <span className="font-medium">
                      {regra.metodo === "percentual" 
                        ? `${(regra.valor / 100).toFixed(2)}%`
                        : regra.metodo === "multiplicador_hora"
                        ? `${(regra.valor / 100).toFixed(2)}x`
                        : `R$ ${(regra.valor / 100).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={regra.ativo ? "default" : "secondary"}>
                      {regra.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              Nenhuma regra cadastrada
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
