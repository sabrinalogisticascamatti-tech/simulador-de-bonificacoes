import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Calculator, Users, FileText, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: funcionarios } = trpc.funcionarios.list.useQuery();
  const { data: regras } = trpc.regras.list.useQuery();
  const { data: simulacoes } = trpc.simulacoes.list.useQuery();

  const stats = [
    {
      title: "Funcionários",
      value: funcionarios?.length || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/funcionarios"
    },
    {
      title: "Regras Ativas",
      value: regras?.filter(r => r.ativo).length || 0,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/regras"
    },
    {
      title: "Simulações",
      value: simulacoes?.length || 0,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/simulacoes"
    },
  ];

  const features = [
    {
      title: "Gerenciar Funcionários",
      description: "Importe, edite e gerencie a base de funcionários via CSV ou manualmente",
      icon: Users,
      href: "/funcionarios",
      color: "text-blue-600"
    },
    {
      title: "Configurar Regras",
      description: "Defina regras de bonificação por função, equipe ou funcionário individual",
      icon: FileText,
      href: "/regras",
      color: "text-green-600"
    },
    {
      title: "Criar Simulações",
      description: "Simule cenários de bonificação e compare resultados com análise por IA",
      icon: Calculator,
      href: "/simulacoes/nova",
      color: "text-purple-600"
    },
    {
      title: "Análise de Resultados",
      description: "Visualize resumos por equipe, totais gerais e relatórios executivos",
      icon: TrendingUp,
      href: "/simulacoes",
      color: "text-orange-600"
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center space-x-4 mb-4">
            <Calculator className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold">Simulador de Bonificação Salarial</h1>
              <p className="text-blue-100 mt-1">
                Sistema completo para simulação e análise de pagamentos de bonificação
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button asChild size="lg" variant="secondary">
              <Link href="/simulacoes/nova">
                <a className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Nova Simulação</span>
                </a>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <a>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </CardTitle>
                      <div className={`${stat.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            );
          })}
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Funcionalidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.title} href={feature.href}>
                  <a>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-center space-x-3 mb-2">
                          <Icon className={`h-6 w-6 ${feature.color}`} />
                          <CardTitle>{feature.title}</CardTitle>
                        </div>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Simulations */}
        {simulacoes && simulacoes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Simulações Recentes</h2>
              <Button asChild variant="outline">
                <Link href="/simulacoes">
                  <a>Ver Todas</a>
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {simulacoes.slice(0, 3).map((sim) => (
                <Link key={sim.id} href={`/simulacoes/${sim.simulacaoId}`}>
                  <a>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">{sim.nomeDaSimulacao}</CardTitle>
                        <CardDescription>
                          {sim.tipoBonificacao.replace('_', ' ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500">
                          {new Date(sim.dataCriacao).toLocaleDateString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
