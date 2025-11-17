import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Upload, Plus, Trash2, Edit, Search, Download } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

export default function Funcionarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: funcionarios, isLoading } = trpc.funcionarios.list.useQuery();
  
  const deleteMutation = trpc.funcionarios.delete.useMutation({
    onSuccess: () => {
      utils.funcionarios.list.invalidate();
      toast.success("Funcionário excluído com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const deleteManyMutation = trpc.funcionarios.deleteMany.useMutation({
    onSuccess: () => {
      utils.funcionarios.list.invalidate();
      setSelectedIds([]);
      toast.success("Funcionários excluídos com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const updateManyMutation = trpc.funcionarios.updateMany.useMutation({
    onSuccess: () => {
      utils.funcionarios.list.invalidate();
      setSelectedIds([]);
      setShowBulkEditDialog(false);
      toast.success("Funcionários atualizados com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const createMutation = trpc.funcionarios.create.useMutation({
    onSuccess: () => {
      utils.funcionarios.list.invalidate();
      setShowAddDialog(false);
      toast.success("Funcionário criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    }
  });

  const importMutation = trpc.funcionarios.importCSV.useMutation({
    onSuccess: (data) => {
      utils.funcionarios.list.invalidate();
      setShowImportDialog(false);
      toast.success(`${data.imported} funcionários importados com sucesso`);
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
        const rows = results.data as Record<string, string>[];

        importMutation.mutate({
          // O backend espera os dados como um array de objetos
          rows
        });
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    });
  };

  const handleAddFuncionario = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      employeeId: formData.get('employeeId') as string,
      nome: formData.get('nome') as string,
      funcao: formData.get('funcao') as string,
      equipe: formData.get('equipe') as string,
      salarioBase: parseFloat(formData.get('salarioBase') as string),
      horasPadraoMes: parseInt(formData.get('horasPadraoMes') as string),
      encargosPercentuais: parseFloat(formData.get('encargosPercentuais') as string),
      observacoes: formData.get('observacoes') as string,
    });
  };

  const handleBulkUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const funcao = formData.get('funcao') as string;
    const equipe = formData.get('equipe') as string;
    const encargosRaw = formData.get('encargosPercentuais') as string;

    const updates: { funcao?: string; equipe?: string; encargosPercentuais?: number } = {};
    if (funcao) updates.funcao = funcao;
    if (equipe) updates.equipe = equipe;
    if (encargosRaw) updates.encargosPercentuais = parseFloat(encargosRaw);

    if (Object.keys(updates).length === 0) return toast.info("Nenhum campo preenchido para atualização.");

    updateManyMutation.mutate({ employeeIds: selectedIds, ...updates });
  }

  const filteredFuncionarios = funcionarios?.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.funcao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.equipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-600 mt-1">Gerencie a base de funcionários do sistema</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" asChild>
              <a href="/template_funcionarios.csv" download="template_funcionarios.csv">
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
                  <DialogTitle>Importar Funcionários via CSV</DialogTitle>
                  <DialogDescription>
                    Selecione um arquivo CSV com os dados dos funcionários. O sistema usará IA para mapear as colunas automaticamente.
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
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>employee_id (obrigatório)</li>
                      <li>nome (obrigatório)</li>
                      <li>funcao (obrigatório)</li>
                      <li>equipe (obrigatório)</li>
                      <li>salario_base (obrigatório)</li>
                      <li>horas_padrao_mes (opcional, padrão: 220)</li>
                      <li>encargos_percentuais (opcional, padrão: 80%)</li>
                      <li>observacoes (opcional)</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Funcionário</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo funcionário
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddFuncionario}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">ID do Funcionário *</Label>
                      <Input id="employeeId" name="employeeId" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input id="nome" name="nome" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="funcao">Função *</Label>
                      <Input id="funcao" name="funcao" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equipe">Equipe *</Label>
                      <Input id="equipe" name="equipe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salarioBase">Salário Base (R$) *</Label>
                      <Input id="salarioBase" name="salarioBase" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horasPadraoMes">Horas/Mês</Label>
                      <Input id="horasPadraoMes" name="horasPadraoMes" type="number" defaultValue="220" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="encargosPercentuais">Encargos (%)</Label>
                      <Input id="encargosPercentuais" name="encargosPercentuais" type="number" step="0.01" defaultValue="80" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Input id="observacoes" name="observacoes" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Funcionários</CardTitle>
                <CardDescription>
                  {funcionarios?.length || 0} funcionário(s) cadastrado(s)
                </CardDescription>
              </div>
              {selectedIds.length > 0 && (                
                <div className="flex items-center space-x-2">
                  <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar {selectedIds.length} selecionado(s)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Funcionários em Massa</DialogTitle>
                        <DialogDescription>
                          Atualize a função, equipe ou encargos para os {selectedIds.length} funcionários selecionados. Deixe os campos em branco para não alterar.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleBulkUpdate}>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="bulk-funcao">Função</Label>
                            <Input id="bulk-funcao" name="funcao" placeholder="Nova função" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bulk-equipe">Equipe</Label>
                            <Input id="bulk-equipe" name="equipe" placeholder="Nova equipe" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bulk-encargos">Encargos (%)</Label>
                            <Input id="bulk-encargos" name="encargosPercentuais" type="number" step="0.01" placeholder="Novo percentual de encargos" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={updateManyMutation.isPending}>
                            {updateManyMutation.isPending ? "Atualizando..." : "Atualizar Selecionados"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteManyMutation.mutate({ employeeIds: selectedIds })}
                    disabled={deleteManyMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteManyMutation.isPending 
                      ? "Excluindo..." 
                      : `Excluir ${selectedIds.length} selecionado(s)`}
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, função, equipe ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : filteredFuncionarios && filteredFuncionarios.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredFuncionarios.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filteredFuncionarios.map(f => f.employeeId));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead className="text-right">Salário Base</TableHead>
                      <TableHead className="text-right">Horas/Mês</TableHead>
                      <TableHead className="text-right">Encargos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFuncionarios.map((func) => (
                      <TableRow key={func.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(func.employeeId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, func.employeeId]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== func.employeeId));
                              }
                            }}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{func.employeeId}</TableCell>
                        <TableCell className="font-medium">{func.nome}</TableCell>
                        <TableCell>{func.funcao}</TableCell>
                        <TableCell>{func.equipe}</TableCell>
                        <TableCell className="text-right">
                          R$ {(func.salarioBase / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{func.horasPadraoMes}h</TableCell>
                        <TableCell className="text-right">
                          {(func.encargosPercentuais / 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate({ employeeId: func.employeeId })}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
