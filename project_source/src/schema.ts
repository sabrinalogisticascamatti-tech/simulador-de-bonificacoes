import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de Funcionários
 */
export const funcionarios = mysqlTable("funcionarios", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: varchar("employee_id", { length: 100 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  funcao: varchar("funcao", { length: 255 }).notNull(),
  equipe: varchar("equipe", { length: 255 }).notNull(),
  salarioBase: int("salario_base").notNull(), // em centavos
  horasPadraoMes: int("horas_padrao_mes").notNull().default(220),
  encargosPercentuais: int("encargos_percentuais").notNull().default(8000), // 80% = 8000 (base 10000)
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Funcionario = typeof funcionarios.$inferSelect;
export type InsertFuncionario = typeof funcionarios.$inferInsert;

/**
 * Tabela de Regras de Bonificação
 */
export const regrasBonificacao = mysqlTable("regras_bonificacao", {
  id: int("id").autoincrement().primaryKey(),
  regraId: varchar("regra_id", { length: 100 }).notNull().unique(),
  scopeType: mysqlEnum("scope_type", ["individual", "funcao", "equipe", "global"]).notNull(),
  scopeValue: varchar("scope_value", { length: 255 }).notNull(), // employee_id, nome da função, nome da equipe, ou "GLOBAL"
  tipo: mysqlEnum("tipo", ["hora_extra", "premiacao", "vale_alimentacao"]).notNull(),
  metodo: mysqlEnum("metodo", ["fixo", "percentual", "multiplicador_hora"]).notNull(),
  valor: int("valor").notNull(), // em centavos ou base 100 para percentuais
  dataInicio: timestamp("data_inicio"),
  dataFim: timestamp("data_fim"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RegraBonificacao = typeof regrasBonificacao.$inferSelect;
export type InsertRegraBonificacao = typeof regrasBonificacao.$inferInsert;

/**
 * Tabela de Simulações
 */
export const simulacoes = mysqlTable("simulacoes", {
  id: int("id").autoincrement().primaryKey(),
  simulacaoId: varchar("simulacao_id", { length: 100 }).notNull().unique(),
  nomeDaSimulacao: varchar("nome_da_simulacao", { length: 255 }).notNull(),
  tipoBonificacao: mysqlEnum("tipo_bonificacao", ["hora_extra", "premiacao", "vale_alimentacao"]).notNull(),
  parametrosJson: text("parametros_json").notNull(), // JSON com todos os parâmetros da simulação
  dataCriacao: timestamp("data_criacao").defaultNow().notNull(),
  createdBy: int("created_by").notNull(), // user id
});

export type Simulacao = typeof simulacoes.$inferSelect;
export type InsertSimulacao = typeof simulacoes.$inferInsert;

/**
 * Tabela de Resultados de Simulação
 */
export const resultadosSimulacao = mysqlTable("resultados_simulacao", {
  id: int("id").autoincrement().primaryKey(),
  simulacaoId: varchar("simulacao_id", { length: 100 }).notNull(),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  funcao: varchar("funcao", { length: 255 }).notNull(),
  equipe: varchar("equipe", { length: 255 }).notNull(),
  salarioBase: int("salario_base").notNull(), // em centavos
  bonusValue: int("bonus_value").notNull(), // em centavos
  encargosValue: int("encargos_value").notNull(), // em centavos
  totalCost: int("total_cost").notNull(), // em centavos
  regraIdAplicada: varchar("regra_id_aplicada", { length: 100 }), // null se for valor manual
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResultadoSimulacao = typeof resultadosSimulacao.$inferSelect;
export type InsertResultadoSimulacao = typeof resultadosSimulacao.$inferInsert;
