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

        for (let i = 0; i < input.rows.length; i++) {
          const row = input.rows[i];
          const mappedRow: Record<string, string> = {};

          // Aplicar mapeamento
          for (let j = 0; j < input.headers.length; j++) {
            const header = input.headers[j];
            const expectedField = mapping.mappings[header];
            if (expectedField) {
              mappedRow[expectedField] = row[j];
            }
          }

          // Validar e inserir
          const validation = validateFuncionarioRow(mappedRow);
          if (validation.valid && validation.data) {
            try {
              await db.upsertFuncionario(validation.data);
              results.success++;
            } catch (error) {
              results.errors.push({
                row: i + 1,
                errors: [`Erro ao inserir: ${error}`]
              });
            }
          } else {
            results.errors.push({
              row: i + 1,
              errors: validation.errors
            });
          }
        }

        return {
          success: true,
          imported: results.success,
          errors: results.errors,
