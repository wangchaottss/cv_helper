## 字体功能模块 — 开发计划（第 1 部分）

### 1. 概述

本模块为图形化简历制作工具提供完整的字体管理能力，支持：
- 读取并使用用户操作系统已安装的字体
- 内置多款开源免费商用字体，保证跨设备一致性
- 在属性面板中提供带预览的字体选择器
- 同一文本单元内允许混合使用不同字体、字号、加粗等格式（借助 contentEditable）
- 存档 HTML 中内嵌所用字体（保证离线可移植）
- PDF 导出时嵌入字体，保证输出效果与编辑时一致

### 2. 功能需求

| 编号 | 需求 | 说明 |
|------|------|------|
| F1 | **系统字体读取** | 获取用户 macOS 系统中已安装的字体列表，并在字体选择器中显示 |
| F2 | **内置免费字体包** | 内置 3~5 款高质量开源字体（中英文），作为基础字体选项，确保所有用户编辑环境一致 |
| F3 | **字体选择器 UI** | 下拉列表展示所有可用字体（系统 + 内置），每项以该字体渲染其名称，提供实时预览；可搜索/过滤 |
| F4 | **全局字体设置** | 在属性面板中修改整个文本单元的基字体/字号等，作用于未单独设置格式的文本部分 |
| F5 | **内联富文本格式** | 选中文本单元内部分文字后，通过格式工具栏修改其字体、字号、加粗、斜体、颜色等，实现同一单元内混合格式 |
| F6 | **存档嵌入字体** | 保存为 HTML 时，检测该文档中使用了哪些字体，将内置字体以 base64 形式嵌入 HTML；若使用了系统字体，则提示用户并提供嵌入替代方案 |
| F7 | **PDF 字体嵌入** | 使用 Electron 的 `printToPDF` 时，在渲染的打印页面中内嵌所需字体，保证 PDF 与原稿一致 |
| F8 | **格式清理** | 提供“清除格式”按钮，可将整个文本单元或选区恢复为纯文本（移除所有内联样式） |

### 3. 技术选型

| 层面 | 方案 | 原因 |
|------|------|------|
| 系统字体枚举 | `font-list` (npm) 或 Electron 原生 `systemPreferences.getSystemPreferences` + 手动解析 | 跨平台，简单可靠，能返回字体名称和大致样式 |
| 内置字体格式 | WOFF2 | 压缩率高，Chromium 完全支持，适合嵌入和网络加载 |
| 富文本编辑核心 | 原生 `contentEditable` + `document.execCommand` + Selection API | 满足需求，避免引入重量级库，桌面环境兼容性好 |
| 富文本状态管理 | 自定义 `useRichText` Hook，监听 `input` / `selectionchange`，将内容 HTML 存储到 Zustand | 与全局状态无缝结合 |
| 字体嵌入工具 | 基于 `fonteditor-core` 或手动提取子集 | 按需提取用到的字符，减小嵌入体积 |

### 4. 内置字体选型

计划内置以下字体（均为 SIL OFL 或等效开源协议，可免费商用）：

| 字体 | 用途 | 文件来源 |
|------|------|----------|
| **思源黑体 (Source Han Sans SC)** | 中文无衬线，适用于正文、标题 | [Adobe Fonts GitHub](https://github.com/adobe-fonts/source-han-sans) → 选取 Regular、Bold 字重 |
| **思源宋体 (Source Han Serif SC)** | 中文衬线，传统风格 | [Adobe Fonts GitHub](https://github.com/adobe-fonts/source-han-serif) → 选取 Regular、Bold |
| **Inter** | 西文无衬线，UI/正文百搭 | [Google Fonts / GitHub](https://github.com/rsms/inter) → Regular、Bold |
| **阿里巴巴普惠体**（可选） | 多字重中文黑体，现代感 | [阿里巴巴官方](https://fonts.alibabagroup.com) → 选取 Regular、Medium、Bold |
| **Crimson Text**（可选） | 西文衬线，简历经典 | Google Fonts → Regular、Bold |

内置字体存放于 `assets/fonts/`，在应用启动时通过 CSS `@font-face` 注册，并用 JavaScript 提前告知字体选择器哪些是内置字体。

### 5. 系统字体读取模块

- **主进程接口**：在 Electron 主进程中添加一个 IPC handler，调用 `font-list` 获取字体列表，返回格式：
  ```typescript
  interface SystemFont {
    family: string;      // "PingFang SC"
    style: string;       // "Regular"
    weight: number;      // 400
    italic: boolean;
    postscriptName: string;
  }
  ```
- **缓存机制**：首次启动时获取一次，存入内存或 localState，后续直接使用缓存。
- **渲染进程使用**：通过 `contextBridge` 暴露 `getSystemFonts()` 方法，在字体选择器组件中调用。
## 字体功能模块 — 开发计划（第 2 部分）

### 6. 字体选择器 UI 设计

- **组件位置**：位于右侧属性面板的“字体”分组中，显示为带预览的下拉列表。
- **样式规格**：
  - 每个选项使用其对应的字体渲染名称（`style="font-family: '字体名'"`），提供实时预览。
  - 内置字体与系统字体在列表中用分隔线（或标签）区分，内置字体优先展示，并带小徽标“内置”标识。
  - 支持**搜索/过滤**：顶部输入框可键入关键字，实时筛选字体名称。
  - 显示字体的字重和样式信息（如 Regular、Bold），允许用户选择同一字体族的不同变体。
  - 默认字体：应用启动时预选“思源黑体”作为新建文本单元的默认字体（可通过设置修改）。
- **交互行为**：
  - 仅当**单个文本单元被选中**时，显示字体下拉并同步显示当前选区（或基字体）所使用的字体。
  - 当未选中文本单元时，字体选择器置灰。
  - 当文本单元内有混合字体时，字体下拉框显示“混合”（或空白），此时修改字体将应用到整个文本单元的基础字体，除非用户通过格式工具栏对选区单独设置。
- **组件结构建议**：使用受控组件 + `@floating-ui` 或 `downshift` 实现可搜索下拉，以确保无障碍和键盘导航。

### 7. 富文本内联格式实现

#### 7.1 数据模型扩展

修改 `TextElement` 接口：
```typescript
interface TextElement extends BaseElement {
  type: 'text';
  contentHTML: string;           // 富文本 HTML，如 "<p>Hello <b>World</b></p>"
  defaultFontFamily: string;     // 全局基字体
  defaultFontSize: number;       // 全局基字号（px）
  defaultColor: string;          // 全局基颜色
  // ... 其他基础属性
}
```
- `contentHTML` 存储带内联格式的完整 HTML，`default*` 系列作为文本单元的全局样式，应用于未被内联 span 覆盖的部分。
- 渲染时使用一个外层 `div` 携带 `default*` 样式，内部 `dangerouslySetInnerHTML` 展示 `contentHTML`；同时开启 `contentEditable`，使内部 span 的样式生效。

#### 7.2 格式工具栏

- **显示时机**：当文本单元被选中且单元进入编辑状态（双击或单击已选中单元）时，在画布上方或单元附近浮现一个轻量工具栏。
- **工具栏按钮**：
  - **加粗 (B)**、*斜体 (I)*、<u>下划线 (U)</u>（使用 `execCommand` 或手动包裹 span）
  - **字体**：迷你下拉，仅作用于当前选区（包裹 `<span style="font-family: ...">`）
  - **字号**：输入框或下拉，包裹 `<span style="font-size: ...px">`
  - **文字颜色**：取色器，包裹 `<span style="color: ...">`
  - **清除格式**：移除选区内的所有 span/style，恢复为纯文本
- **实现方式**：
  - 避免使用 `execCommand` 直接操作字体/字号（兼容性差，且生成的 HTML 不可控），改用 **Selection API + Range** 包裹 `<span>` 并添加内联样式。
  - 封装 `formatSelection(command, value)` 工具函数，处理文本选择并修改 DOM，最后触发 `onInput` 事件，将更新后的 `innerHTML` 回写到 store。

#### 7.3 与全局状态同步

- 在文本单元的 `onInput` 事件中，将 `innerHTML` 提取并存入 Zustand 的对应元素 `contentHTML` 字段。
- 为防止频繁更新影响性能，使用防抖（debounce 300ms）更新 store，但保证在失焦时立即更新一次。
- 撤销/重做：将 `contentHTML` 的变更视为一次原子操作，可结合 `onBlur` 快照，或采用命令模式记录修改前后的 HTML 字符串。

### 8. 存档 HTML 中的字体嵌入

#### 8.1 流程设计

1. **收集使用到的字体**：遍历当前所有文本元素的 `contentHTML` 及其 `defaultFontFamily`，提取所有 `font-family` 引用。排除浏览器默认字体（如 `serif`、`sans-serif`）和可能不在内置列表中的系统字体。
2. **查找对应字体文件**：对于每个使用到的内置字体（如 “Source Han Sans SC”），从应用的 `assets/fonts/` 目录读取对应字重的 `.woff2` 文件。
3. **生成 base64 CSS**：将字体文件转换为 base64 字符串，生成 `@font-face` 规则：
   ```css
   @font-face {
     font-family: 'Source Han Sans SC';
     src: url(data:font/woff2;base64,xxxx) format('woff2');
     font-weight: 400;
     font-style: normal;
   }
   ```
4. **嵌入 HTML**：将生成的 `<style>` 块插入存档 HTML 的 `<head>` 中。**注意**：只嵌入实际使用的字重（Regular/Bold），避免体积过大。
5. **系统字体提示**：如果检测到使用了系统字体（非内置且非通用回退），在保存时弹窗提示用户：“文档使用了系统字体‘XXX’，该字体可能在其他设备上无法正确显示。建议替换为内置字体或嵌入替代字体。” 并提供“仍然保存”或“返回替换”按钮。

#### 8.2 字体子集化（可选高级功能）

- 为避免嵌入整个字体文件（中文一个文件可能 5–10 MB），使用 `fonteditor-core` 或 `harfbuzzjs` 等工具提取文档中实际出现字符的子集。
- 在 Node.js 环境（Electron 主进程或渲染进程的 Node 层）中执行子集化操作，生成最小化字体文件后再转为 base64。
- 此功能作为后期优化项，初期可接受完整字体嵌入（对简历文档，通常内容不多，字体文件也可接受）。

### 9. PDF 导出中的字体嵌入

#### 9.1 Electron `printToPDF` 原生支持

- 当为打印创建一个隐藏的 `BrowserWindow` 并加载包含画布内容的 HTML 时，同样在该 HTML 中**提前声明所有用到的 `@font-face` 规则**，资源使用 base64 或文件路径。
- 由于 `printToPDF` 使用 Chromium 的打印引擎，它能正确解析这些内嵌字体并将其嵌入到生成的 PDF 中，字体子集化通常由 Chromium 自动完成。
- **关键点**：必须确保打印页中不再引用任何外部字体（如 Google Fonts 链接），所有字体资源本地化或内联。

#### 9.2 导出流程

1. **构建打印版 HTML**：基于当前画布状态，生成一个纯净的 HTML 文档，仅包含 A4 尺寸的容器、所有画布元素（不含辅助线、UI），以及之前生成的内嵌字体 CSS。
2. **加载到隐藏窗口**：创建一个不可见的 `BrowserWindow`，设置 `show: false`，加载该 HTML（可用 `data:text/html` 或者通过临时文件）。
3. **等待字体加载**：使用 `document.fonts.ready` 确保网页字体已全部解析，避免 PDF 出现回退字体。
4. **生成 PDF**：调用 `webContents.printToPDF({ printBackground: true, pageSize: 'A4', marginsType: 0 })`。
5. **保存**：将 buffer 写入用户选择的路径。

### 10. 开发阶段与优先级

| 阶段 | 任务 | 优先级 |
|------|------|--------|
| **F1-系统字体** | 集成 `font-list`，主进程获取字体，渲染进程消费 | P0 （基础功能） |
| **F3-选择器 UI** | 制作带预览、搜索的字体下拉，区分内置/系统 | P0 |
| **F4-全局字体设置** | 属性面板修改单元基字体，联动画布 | P0 |
| **F5-富文本内联格式** | contentEditable + 格式工具栏，混合格式编辑 | P1 （核心体验） |
| **F2-内置字体** | 下载并注册 3~5 款开源字体，写入应用资源 | P1 |
| **F7-PDF 嵌入** | 打印页内嵌字体，确保 PDF 一致 | P1 |
| **F6-存档嵌入** | HTML 存档中内嵌使用到的内置字体 | P2 |
| **F8-格式清理** | 清除格式按钮 | P2 |
| **字体子集化** | 嵌入时压缩字体文件 | P3 （优化项） |

### 11. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 系统字体获取在不同 macOS 版本上差异 | 使用成熟的 `font-list` 包，它已有各平台适配；或用 Electron 原生 API 做降级 |
| 内置字体过多导致应用包体积过大 | 每个字体限制 2 个字重（Regular + Bold），使用 woff2 压缩；按需加载 |
| contentEditable 生成的 HTML 冗余或异常 | 限制可用的格式化操作，定期清理无用 span；提供预览模式检查效果 |
| 嵌入字体后存档文件过大 | 提供子集化选项，或在保存时告知用户文件大小；默认启用基础子集 |
| 隐藏窗口打印 PDF 时字体加载超时 | 设置合理的超时时间，并检测 `document.fonts.ready` 状态，失败时用系统后备字体并提示用户 |

---

此字体功能模块计划覆盖了从编辑器内字体选择、混合格式编辑，到存档和 PDF 输出的完整链路，确保简历制作工具的字体体验专业且可移植。
