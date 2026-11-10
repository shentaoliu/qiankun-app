import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  registerMicroApps,
  start,
  addGlobalUncaughtErrorHandler,
} from "qiankun";
import "./style.css";

function App() {
  const [message, setMessage] = useState("等待子应用发送消息");
  return (
    <main className="host">
      <header>
        <small>QIANKUN · REACT · TYPESCRIPT · VITE</small>
        <h1>微前端基座</h1>
        <p>基座负责导航和加载，子应用独立开发、独立运行。</p>
      </header>
      <nav>
        <a href="/">基座首页</a>
        <a href="/child">加载子应用</a>
      </nav>
      <p className="message">子应用消息：{message}</p>
      <p id="load-error" role="alert" />
      <section id="micro-container" />
      <footer>访问 /child 挂载子应用，返回首页触发 unmount。</footer>
      <MessageBridge onMessage={setMessage} />
    </main>
  );
}
// 注册在 React 提交 DOM 后进行，确保容器已经存在。
import { useEffect } from "react";
function MessageBridge({
  onMessage,
}: {
  onMessage: (message: string) => void;
}) {
  useEffect(() => {
    registerMicroApps([
      {
        name: "react-child",
        entry: "http://localhost:5174",
        container: "#micro-container",
        activeRule: "/child",
        props: { title: "来自基座的问候", onMessage },
      },
    ]);
    addGlobalUncaughtErrorHandler(() => {
      const element = document.querySelector("#load-error");
      if (element)
        element.textContent =
          "子应用加载失败，请确认 localhost:5174 已启动，再刷新页面。";
    });
    start({ prefetch: false });
  }, [onMessage]);
  return null;
}
createRoot(document.getElementById("root")!).render(<App />);
