import { defineConfig } from 'vite';

// 基座不需要 vite-plugin-qiankun；通过运行时 qiankun API 注册、启动子应用。
export default defineConfig({
  // 固定基座端口；与子应用 5174 分开，演示跨域加载。
  // strictPort 避免端口被占用时自动换端口，导致访问地址与约定不一致。
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
