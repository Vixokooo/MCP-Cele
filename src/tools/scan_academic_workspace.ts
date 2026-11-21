import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { error, texto } from "../lib/respuestas.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const BASE_DIR = path.resolve(process.cwd(), "workspace_academico");

export function register(server: McpServer): void {
  server.registerTool(
    "scan_academic_workspace",
    {
      title: "Scan academic workspace",
      description:
        "Escanea la carpeta académica local (workspace_academico) para listar apuntes, guías y subcarpetas por ramo, mostrando tamaño, extensión y fecha de modificación.",
      inputSchema: {
        subDir: z
          .string()
          .optional()
          .describe("Subdirectorio relativo dentro de workspace_academico (por defecto '.' para la raíz)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ subDir }) => {
      try {
        const relative = subDir && subDir.trim() !== "" ? subDir : ".";
        const targetDir = path.resolve(BASE_DIR, relative);

        if (!targetDir.startsWith(BASE_DIR)) {
          return error("Acceso denegado: la ruta sale del directorio workspace_academico.");
        }

        await fs.mkdir(targetDir, { recursive: true });
        const entries = await fs.readdir(targetDir, { withFileTypes: true });

        const items = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(targetDir, entry.name);
            const stats = await fs.stat(fullPath);
            return {
              nombre: entry.name,
              tipo: entry.isDirectory() ? "carpeta" : "archivo",
              extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
              tamanoBytes: stats.size,
              ultimaModificacion: stats.mtime.toISOString(),
            };
          })
        );

        return texto(
          JSON.stringify(
            {
              directorioBase: BASE_DIR,
              directorioEscaneado: targetDir,
              totalElementos: items.length,
              elementos: items,
            },
            null,
            2
          )
        );
      } catch (e) {
        return error(`Fallo en scan_academic_workspace: ${(e as Error).message}`);
      }
    }
  );
}