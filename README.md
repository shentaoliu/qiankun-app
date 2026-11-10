# qiankun 微前端示例

两个项目均使用 React 18、TypeScript 和 Vite 6。

## 启动

终端一，在 `qiankun-child` 目录运行 `pnpm install`、`pnpm dev`。
终端二，在 `qiankun-app` 目录运行 `pnpm install`、`pnpm dev`。

打开 http://localhost:5173/child 查看基座加载的子应用。
打开 http://localhost:5174 查看独立子应用。
点击「发送消息给基座」演示 props 回调通信；计数器演示子应用内部状态。
返回基座首页会卸载子应用，再进入时计数重置。

## 实现位置

- 基座 `src/main.tsx`：注册子应用、路由激活规则、加载错误提示和通信回调。
- 子应用 `src/main.tsx`：bootstrap、mount、unmount、update 生命周期；卸载时销毁 React 根节点。
- 子应用 `vite.config.ts`：qiankun 插件、跨域和资源地址。应用名必须与基座注册名一致。

## 构建与预览

两个目录分别运行 `pnpm build`，再分别运行 `pnpm preview`，访问地址同开发模式。
当前子应用 base 和基座 entry 固定为 http://localhost:5174，部署时须一起修改为实际子应用地址，并为跨域资源设置 CORS。
基座生产服务器需要为 /child 等路径配置回退到 index.html。

Vite 子应用通过 vite-plugin-qiankun 适配 qiankun 生命周期。按插件要求未启用 React Fast Refresh 插件；ESM 子应用也不具备传统 qiankun 完整 JS 沙箱隔离，避免修改全局变量，样式使用各自前缀。

目前实现的是一个最小的 qiankun 微前端示例：**基座负责加载和导航，子应用负责自己的 React 页面，并支持单独启动。** 重点是把 qiankun 的注册、激活、挂载、卸载和通信流程串起来。

代码已经写好，但依赖安装未完成，以下说明的是代码实现，运行效果还没有验证。

### 1. 两个项目各自独立

两个目录都有自己的 `package.json`、Vite 配置、TypeScript 配置和 React 入口：

```text
qiankun-app（基座，5173）
  └─ qiankun 根据 URL 加载子应用
       └─ qiankun-child（子应用，5174）
```

基座安装 `qiankun`，子应用使用 `vite-plugin-qiankun` 适配 Vite。

这里的加载方式不是把子应用作为 React 组件导入，也不是 iframe。基座通过子应用的 HTML 入口获取资源，再由 qiankun 调用子应用暴露的生命周期，将页面挂载到指定容器。

### 2. 基座注册子应用

在[基座入口](/Users/shentaoliu/Documents/learning/mianshi/qiankun-app/src/main.tsx)中配置了：

```tsx
registerMicroApps([
  {
    name: "react-child",
    entry: "http://localhost:5174",
    container: "#micro-container",
    activeRule: "/child",
    props: {
      title: "来自基座的问候",
      onMessage,
    },
  },
]);
```

这几个字段是接入的核心：

| 字段         | 当前作用                                       |
| ------------ | ---------------------------------------------- |
| `name`       | 子应用名称，与子应用 Vite 插件中的名称保持一致 |
| `entry`      | 子应用 HTML 入口地址                           |
| `container`  | 子应用页面最终放入基座的哪个 DOM 节点          |
| `activeRule` | URL 满足什么条件时加载子应用                   |
| `props`      | 基座向子应用传入的数据和方法                   |

基座页面预先渲染了：

```tsx
<section id="micro-container" />
```

注册和启动放在 React 的 `useEffect` 中，保证 React 已经创建这个容器，避免 qiankun 挂载时找不到节点。

随后调用：

```tsx
start({ prefetch: false });
```

`start()` 启动 qiankun。这里关闭了预加载，方便观察“进入 `/child` 后才加载子应用”的过程。

### 3. 根据 URL 激活和卸载

当前通过：

```tsx
activeRule: "/child";
```

控制子应用是否激活：

- 访问 `/`：显示基座。
- 访问 `/child`：加载并挂载子应用。
- 离开 `/child`：如果发生客户端路由切换，qiankun 会卸载子应用。

**当前导航使用普通 `<a href>`，会发生整页刷新。** 所以目前还不能通过点击导航完整观察“同一个基座页面中卸载再挂载”的过程；README 中对此描述得过于理想化。要演示这部分，下一步应接入 React Router，使用 `Link` 做客户端导航。

### 4. 子应用暴露 qiankun 生命周期

在[子应用入口](/Users/shentaoliu/Documents/learning/mianshi/qiankun-child/src/main.tsx)中，通过插件提供的 `renderWithQiankun` 注册了生命周期：

```tsx
renderWithQiankun({
  bootstrap() {
    console.info("[react-child] bootstrap");
  },
  mount(props) {
    render(props as AppProps);
  },
  unmount() {
    root?.unmount();
    root = null;
  },
  update(props) {
    root?.render(<App {...(props as AppProps)} />);
  },
});
```

各个阶段的职责如下：

**`bootstrap`：初始化。**  
通常在子应用首次加载时执行，适合做一次性的初始化。当前只是输出日志。

**`mount`：挂载页面。**  
每次激活子应用时，创建 React 根节点，把基座传来的 props 交给子应用组件。

**`unmount`：销毁页面。**  
调用 `root.unmount()`，卸载 React 组件并触发组件的清理逻辑，然后清空根节点引用。以后如果增加定时器、订阅或全局事件监听，也需要在组件清理函数或卸载流程中释放。

**`update`：更新页面。**  
代码预留了接收新 props 并重新渲染的能力，不过当前基座没有主动触发更新的逻辑。

### 5. 区分“独立运行”和“基座内运行”

子应用通过：

```tsx
qiankunWindow.__POWERED_BY_QIANKUN__;
```

判断运行环境。

```tsx
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
```

因此：

- 直接访问 `localhost:5174`，子应用自己调用 `render()`。
- 被基座加载时，等待 qiankun 调用 `mount()`，再执行渲染。

这样避免同一个子应用被渲染两次。

寻找 React 挂载节点时，也区分了两种情况：

```tsx
const element = props.container
  ? props.container.querySelector("#root")
  : document.getElementById("root");
```

这是一个关键细节：**嵌入基座时，必须优先在 qiankun 提供的容器里寻找子应用节点。** 因为基座本身也有 `#root`，直接全局查找可能误选基座根节点。

### 6. 实现了最简单的应用通信

当前使用的是 **props + 回调函数**。

基座传入：

```tsx
props: {
  title: '来自基座的问候',
  onMessage,
}
```

子应用展示 `title`，点击按钮后调用：

```tsx
onMessage?.(`你好，基座！当前计数为 ${count}`);
```

基座收到消息后更新自己的 React 状态，并显示出来。

因此通信链路是：

```text
基座 → props.title → 子应用展示
子应用 → props.onMessage(...) → 基座更新状态
```

这种方式足够支撑当前示例，没有额外引入 qiankun 的全局状态机制。

### 7. 处理 Vite 的接入配置

在[子应用 Vite 配置](/Users/shentaoliu/Documents/learning/mianshi/qiankun-child/vite.config.ts)中配置了：

```tsx
plugins: [qiankun("react-child", { useDevMode: true })];
```

插件负责适配 Vite 子应用的入口和 qiankun 生命周期，使用方式参考了[插件项目文档](https://github.com/tengmaoqing/vite-plugin-qiankun)。

同时配置：

```tsx
base: 'http://localhost:5174/'

server: {
  port: 5174,
  strictPort: true,
  cors: true,
  origin: 'http://localhost:5174',
}
```

这些配置分别解决：

- **资源地址**：让子应用资源指向自己的服务。
- **跨域请求**：基座和子应用端口不同，需要允许跨域加载。
- **端口稳定**：端口占用时直接报错，避免 Vite 自动换端口后，基座仍请求旧地址。

目前地址写死为本地演示地址，部署时需要同步修改子应用 `base` 和基座 `entry`。

### 8. 错误提示与隔离范围

基座注册了全局异常处理，出现异常时提示检查子应用服务是否启动。当前提示比较基础，尚未区分网络错误、脚本执行错误等具体原因。

样式使用 `.host` 和 `.child-app` 前缀减少相互影响，但**没有配置严格的 CSS 隔离**。另外，插件文档指出 Vite 的 ESM 接入方式存在 JS 沙箱限制，因此当前示例不能视为具有完整的全局变量隔离能力。[插件说明](https://github.com/tengmaoqing/vite-plugin-qiankun)

这次完成的 qiankun 核心链路就是：**注册子应用 → 按路径激活 → 获取入口资源 → 调用生命周期 → 挂载 React → 通过 props 通信 → 卸载时销毁 React 根节点。**

## 客户端路由

基座和子应用均通过 React Router 的 BrowserRouter、Routes 和 Link 导航，无需整页刷新。
基座匹配 /child/*，且始终保留 qiankun 容器供卸载使用。
子应用嵌入时 basename 为 /child，独立运行时为 /。
因此关于页在基座中是 /child/about，独立运行时是 /about。
浏览器前进、后退和直接访问这些路径均由对应路由处理；生产服务器需要配置 history 回退。
在子应用首页与关于页之间切换保留计数，返回基座首页后子应用卸载，再进入时计数重置。

## 导航对应关系

| 基座菜单 | 基座路径 | 子应用独立路径 |
| --- | --- | --- |
| 子应用首页 | /child | / |
| 关于子应用 | /child/about | /about |

子应用独立运行时显示左侧菜单；嵌入基座时不渲染子应用侧栏，由基座菜单统一导航。
