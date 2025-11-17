        const parsed = Papa.parse(input.csvContent, {
          header: true,
          skipEmptyLines: true,
        });

        const headers = parsed.meta.fields || [];
        const rows = parsed.data as Record<string, string>[];
        
        const sampleRows = rows.slice(0, 3).map(row => headers.map(h => row[h] || ''));
        const mapping = await mapCSVColumnsWithAI(headers, expectedFields, sampleRows);

        if (mapping.errors.length > 0) {
          return { success: false, errors: mapping.errors, warnings: mapping.warnings };
        }

        // Processar linhas
        const results = {
          success: 0,
          errors: [] as Array<{ row: number; errors: string[] }>,
        };

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const mappedRow: Record<string, string> = {};

          // Aplicar mapeamento
          for (const csvHeader in mapping.mappings) {
            const expectedField = mapping.mappings[csvHeader];
            const value = row[csvHeader];
            if (expectedField && value !== undefined) {
              mappedRow[expectedField] = value;
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