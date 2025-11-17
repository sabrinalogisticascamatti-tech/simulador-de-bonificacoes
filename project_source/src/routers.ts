          const sampleRows = input.rows.slice(0, 3);
          const mapping = await mapCSVColumnsWithAI(input.headers, expectedFields, sampleRows);

          if (mapping.errors.length > 0) {
            return { success: false, errors: mapping.errors, warnings: mapping.warnings };
          }

          // Processar linhas
          const results = {
            success: 0,
            errors: [] as Array<{ row: number; errors: string[] }>,
          };

          const validFuncionarios: InsertFuncionario[] = [];

          for (let i = 0; i < input.rows.length; i++) {
            const row = input.rows[i];
            const mappedRow = Object.entries(mapping.mappings).reduce((acc, [csvHeader, expectedField]) => {
              if (row[csvHeader] !== undefined) {
                acc[expectedField] = row[csvHeader];
              }
              return acc;
            }, {} as Record<string, string>);

            // Validar e inserir
            const validation = validateFuncionarioRow(mappedRow);
            if (validation.valid && validation.data) {
              validFuncionarios.push(validation.data);
            } else {
              results.errors.push({ row: i + 2, errors: validation.errors }); // +2 para contar header e index 0
            }
          }

          if (validFuncionarios.length > 0) {
            try {
              // Usar uma única operação de bulk upsert
              await db.upsertManyFuncionarios(validFuncionarios);
              results.success = validFuncionarios.length;
            } catch (error) {
              results.errors.push({ row: 0, errors: [`Erro geral ao inserir em massa: ${error}`] });
            }
          }

          // Adicionar a nova mutação updateMany aqui
          // (Este é um exemplo de onde a lógica entraria no seu router de funcionários)
          /*
          updateMany: protectedProcedure
            .input(z.object({
              employeeIds: z.array(z.string()),
              funcao: z.string().optional(),
              equipe: z.string().optional(),
              encargosPercentuais: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }) => {
              const { employeeIds, ...updates } = input;
              
              // Remove chaves com valores undefined para não atualizar campos não preenchidos
              const dataToUpdate = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined && v !== ''));

              if (Object.keys(dataToUpdate).length === 0) return;

              await ctx.db.updateManyFuncionarios(employeeIds, dataToUpdate);
            }),
          */

          return {
            success: true,
            imported: results.success,
            errors: results.errors,
