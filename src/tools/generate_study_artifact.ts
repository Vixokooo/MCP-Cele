import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { error, texto } from "../lib/respuestas.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const BASE_DIR = path.resolve(process.cwd(), "workspace_academico");

export function register(server: McpServer): void {
  server.registerTool(
    "generate_study_artifact",
    {
      title: "Generate study artifact",
      description:
        "Crea una subcarpeta por asignatura (si no existe) dentro de workspace_academico y guarda un documento Markdown (.md) con una guía de estudio, resumen o checklist.",
      inputSchema: {
        courseName: z
          .string()
          .min(1)
          .describe("Nombre del ramo o asignatura (ej. 'Inteligencia_Artificial' o 'POO')."),
        fileName: z
          .string()
          .min(1)
          .describe("Nombre del archivo Markdown a crear (ej. 'Guia_Certamen_1.md')."),
        markdownContent: z
          .string()
          .min(1)
          .describe("Contenido completo en formato Markdown que se guardará en el archivo."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ courseName, fileName, markdownContent }) => {
      try {
        const safeCourse = courseName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeFile = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
        const targetPath = path.resolve(BASE_DIR, safeCourse, safeFile);

        if (!targetPath.startsWith(BASE_DIR)) {
          return error("Acceso denegado: la ruta sale del directorio workspace_academico.");
        }

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, markdownContent, "utf-8");

        return texto(
          JSON.stringify(
            {
              estado: "creado",
              carpetaRamo: safeCourse,
              archivoGuardado: path.relative(BASE_DIR, targetPath),
              bytesEscritos: Buffer.byteLength(markdownContent, "utf-8"),
            },
            null,
            2
          )
        );
      } catch (e) {
        return error(`Fallo en generate_study_artifact: ${(e as Error).message}`);
      }
    }
  );
}