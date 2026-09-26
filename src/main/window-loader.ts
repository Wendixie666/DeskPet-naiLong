import path from "node:path";

export interface RendererWindow {
  loadFile(filePath: string): Promise<void>;
  isDestroyed(): boolean;
  show(): void;
}

export async function loadRendererPage(
  window: RendererWindow,
  pageName: string,
  appPath: string,
): Promise<void> {
  const pagePath = path.join(appPath, "src/renderer", pageName);
  try {
    await window.loadFile(pagePath);
  } catch (error) {
    console.error(`渲染页面加载失败：${pagePath}`, error);
    return;
  }

  if (!window.isDestroyed()) {
    window.show();
  }
}
