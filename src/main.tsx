import { Alert, Button, Card, ConfigProvider, Layout, Menu, Result, Space, Tag, Typography } from 'antd';
import { useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { createRoot } from "react-dom/client";
import {
  registerMicroApps,
  start,
  addGlobalUncaughtErrorHandler,
} from "qiankun";
import "./style.css";

function App() {
  const [message, setMessage] = useState("等待子应用发送消息");
  const { pathname } = useLocation();
  const inChild = pathname === '/child' || pathname.startsWith('/child/');
  return <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 12 } }}>
    <Layout className="host">
      <Layout.Sider breakpoint="lg" collapsedWidth={0} width={232} className="host-sidebar">
        <div className="host-brand"><span>Q</span><div>微应用工作台<small>MICRO FRONTEND</small></div></div>
        <Menu theme="dark" mode="inline" selectedKeys={[pathname.replace(/\/$/, '') || '/']} items={[
          { key: '/', label: <Link to="/">工作台首页</Link> },
          { key: '/child', label: <Link to="/child">子应用首页</Link> },
          { key: '/child/about', label: <Link to="/child/about">关于子应用</Link> },
        ]} />
        <div className="host-sidebar-note">一个基座，连接独立应用。</div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="host-topbar"><Typography.Text strong>微前端演示平台</Typography.Text><Tag color="blue">React + qiankun</Tag></Layout.Header>
        <Layout.Content className="host-content">
          <div className="host-heading"><div><Typography.Text type="secondary">WORKSPACE / {inChild ? 'APPLICATION' : 'OVERVIEW'}</Typography.Text><Typography.Title level={2}>{inChild ? (pathname === '/child/about' ? '关于子应用' : '子应用首页') : '欢迎来到工作台'}</Typography.Title><Typography.Paragraph type="secondary">独立开发，统一体验。从这里探索应用之间的连接。</Typography.Paragraph></div><Tag color={inChild ? 'green' : 'default'}>{inChild ? '子应用路由已激活' : '基座首页'}</Tag></div>
          <Alert showIcon type="info" message="应用通信" description={message} className="host-message" />
          <p id="load-error" role="alert" />
          <Routes>
            <Route path="/" element={<Card className="host-welcome"><Tag color="purple">开始探索</Tag><Typography.Title level={3}>你的微应用，已准备就绪</Typography.Title><Typography.Paragraph type="secondary">进入子应用体验独立路由、交互计数和双向通信。返回这里后，再次进入即可开始新的会话。</Typography.Paragraph><Space wrap><Link to="/child"><Button type="primary" size="large">进入子应用 →</Button></Link><Tag>React 18</Tag><Tag>TypeScript</Tag><Tag>Vite</Tag></Space></Card>} />
            <Route path="/child/*" element={null} />
            <Route path="*" element={<Result status="404" title="页面不存在" extra={<Link to="/">返回首页</Link>} />} />
          </Routes>
          {/* 始终保留容器，供 qiankun 异步卸载。 */}
          <section id="micro-container" />
        </Layout.Content>
        <Layout.Footer className="host-footer">微应用工作台 · Built with React & Ant Design</Layout.Footer>
      </Layout>
      <MessageBridge onMessage={setMessage} />
    </Layout>
  </ConfigProvider>;
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
createRoot(document.getElementById("root")!).render(<BrowserRouter><App /></BrowserRouter>);
