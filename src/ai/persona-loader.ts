import { readFileSync } from "node:fs";
import path from "node:path";

export interface PersonaLoader {
  load(file: string): string;
}

export function createPersonaLoader(directory: string): PersonaLoader {
  const root = path.resolve(directory);

  return {
    load(file) {
      const filePath = path.resolve(root, file);
      if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        throw new Error("人设文件无效");
      }
      try {
        return readFileSync(filePath, "utf8");
      } catch {
        throw new Error("人设文件读取失败");
      }
    },
  };
}
