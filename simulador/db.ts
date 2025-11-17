import { eq, and, or, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  funcionarios,
  regrasBonificacao,
  simulacoes,
  resultadosSimulacao,
  type Funcionario,
  type InsertFuncionario,
  type RegraBonificacao,
  type InsertRegraBonificacao,
  type Simulacao,
  type InsertSimulacao,
  type ResultadoSimulacao,
  type InsertResultadoSimulacao
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== FUNCIONÁRIOS ==========

export async function getAllFuncionarios(): Promise<Funcionario[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(funcionarios);
}

export async function getFuncionarioByEmployeeId(employeeId: string): Promise<Funcionario | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(funcionarios).where(eq(funcionarios.employeeId, employeeId)).limit(1);
  return result[0];
}

export async function insertFuncionario(data: InsertFuncionario): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(funcionarios).values(data);
}

export async function upsertFuncionario(data: InsertFuncionario): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(funcionarios).values(data).onDuplicateKeyUpdate({
    set: {
      nome: data.nome,
      funcao: data.funcao,
      equipe: data.equipe,
      salarioBase: data.salarioBase,
      horasPadraoMes: data.horasPadraoMes,
      encargosPercentuais: data.encargosPercentuais,
      observacoes: data.observacoes,
    }
  });
}

export async function deleteFuncionario(employeeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(funcionarios).where(eq(funcionarios.employeeId, employeeId));
}

export async function deleteFuncionarios(employeeIds: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const id of employeeIds) {
    await db.delete(funcionarios).where(eq(funcionarios.employeeId, id));
  }
}

// ========== REGRAS DE BONIFICAÇÃO ==========

export async function getAllRegras(): Promise<RegraBonificacao[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regrasBonificacao);
}

export async function getRegraByRegraId(regraId: string): Promise<RegraBonificacao | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(regrasBonificacao).where(eq(regrasBonificacao.regraId, regraId)).limit(1);
  return result[0];
}

export async function insertRegra(data: InsertRegraBonificacao): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(regrasBonificacao).values(data);
}

export async function upsertRegra(data: InsertRegraBonificacao): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(regrasBonificacao).values(data).onDuplicateKeyUpdate({
    set: {
      scopeType: data.scopeType,
      scopeValue: data.scopeValue,
      tipo: data.tipo,
      metodo: data.metodo,
      valor: data.valor,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      ativo: data.ativo,
    }
  });
}

export async function deleteRegra(regraId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(regrasBonificacao).where(eq(regrasBonificacao.regraId, regraId));
}

export async function getRegrasAplicaveis(
  employeeId: string,
  funcao: string,
  equipe: string,
  tipo: "hora_extra" | "premiacao" | "vale_alimentacao",
  dataSimulacao: Date
): Promise<RegraBonificacao | null> {
  const db = await getDb();
  if (!db) return null;

  // Precedência: individual > funcao > equipe > global
  const precedencias = [
    { scopeType: "individual" as const, scopeValue: employeeId },
    { scopeType: "funcao" as const, scopeValue: funcao },
    { scopeType: "equipe" as const, scopeValue: equipe },
    { scopeType: "global" as const, scopeValue: "GLOBAL" },
  ];

  for (const { scopeType, scopeValue } of precedencias) {
    const regras = await db
      .select()
      .from(regrasBonificacao)
      .where(
        and(
          eq(regrasBonificacao.scopeType, scopeType),
          eq(regrasBonificacao.scopeValue, scopeValue),
          eq(regrasBonificacao.tipo, tipo),
          eq(regrasBonificacao.ativo, true)
        )
      )
      .limit(1);

    if (regras.length > 0) {
      return regras[0];
    }
  }

  return null;
}

// ========== SIMULAÇÕES ==========

export async function getAllSimulacoes(): Promise<Simulacao[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simulacoes).orderBy(simulacoes.dataCriacao);
}

export async function getSimulacaoById(simulacaoId: string): Promise<Simulacao | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(simulacoes).where(eq(simulacoes.simulacaoId, simulacaoId)).limit(1);
  return result[0];
}

export async function insertSimulacao(data: InsertSimulacao): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(simulacoes).values(data);
}

export async function deleteSimulacao(simulacaoId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Deletar resultados primeiro
  await db.delete(resultadosSimulacao).where(eq(resultadosSimulacao.simulacaoId, simulacaoId));
  // Deletar simulação
  await db.delete(simulacoes).where(eq(simulacoes.simulacaoId, simulacaoId));
}

// ========== RESULTADOS DE SIMULAÇÃO ==========

export async function getResultadosBySimulacaoId(simulacaoId: string): Promise<ResultadoSimulacao[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resultadosSimulacao).where(eq(resultadosSimulacao.simulacaoId, simulacaoId));
}

export async function insertResultado(data: InsertResultadoSimulacao): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(resultadosSimulacao).values(data);
}

export async function insertResultados(data: InsertResultadoSimulacao[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const resultado of data) {
    await db.insert(resultadosSimulacao).values(resultado);
  }
}
