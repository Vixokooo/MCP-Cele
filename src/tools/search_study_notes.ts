import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { error, texto } from "../lib/respuestas.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const BASE_DIR = path.resolve(process.cwd(), "workspace_academico");

export function register(server: McpServer): void {
  server.registerTool(
    "search_study_notes",
    {
      title: "Search study notes",
      description:
        "Busca conceptos clave, definiciones o fórmulas dentro de todos los apuntes locales (.md, .txt, .csv, .json) en workspace_academico y devuelve archivo, línea y fragmento exacto.",
      inputSchema: {
        query: z.string().min(1).describe("Palabra clave o concepto académico a buscar en los apuntes."),
        subDir: z
          .string()
          .optional()
          .describe("Subcarpeta específica donde buscar (opcional, por defecto '.' para todo el workspace)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, subDir }) => {
      try {
        const relative = subDir && subDir.trim() !== "" ? subDir : ".";
        const targetDir = path.resolve(BASE_DIR, relative);

        if (!targetDir.startsWith(BASE_DIR)) {
          return error("Acceso denegado: la ruta sale del directorio workspace_academico.");
        }

        await fs.mkdir(targetDir, { recursive: true });
        const validExts = [".md", ".txt", ".csv", ".json"];
        const matches: Array<{ archivo: string; linea: number; fragmento: string }> = [];

        async function walk(dir: string) {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (validExts.includes(path.extname(entry.name).toLowerCase())) {
              const content = await fs.readFile(fullPath, "utf-8");
              const lines = content.split(/\r?\n/);
              lines.forEach((lineText, idx) => {
                if (lineText.toLowerCase().includes(query.toLowerCase())) {
                  matches.push({
                    archivo: path.relative(BASE_DIR, fullPath),
                    linea: idx + 1,
                    fragmento: lineText.trim(),
                  });
                }
              });
            }
          }
        }

        await walk(targetDir);

        return texto(
          JSON.stringify(
            {
              terminoBuscado: query,
              totalCoincidencias: matches.length,
              coincidencias: matches,
            },
            null,
            2
          )
        );
      } catch (e) {
        return error(`Fallo en search_study_notes: ${(e as Error).message}`);
      }
    }
  );
}