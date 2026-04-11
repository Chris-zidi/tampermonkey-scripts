# 错题本

> 每次修复成功后总结错误、抽象规则。
> 每次开始新改动前逐条检查自检清单。

---

## 错误 #1：JS `.click()` 和 `dispatchEvent` 在 React 15 页面无法触发数据更新

**日期：** 2026-04-11
**现象：** 通过 JS 调用 checkbox 的 `.click()`、`dispatchEvent(new MouseEvent('click'))` 或直接设置 `checkbox.checked = true/false`，弹窗内视觉上 checkbox 状态改了，但关闭弹窗后外面的文本框（textarea）没有更新，还是旧的国家列表。
**根因：** React 15 的合成事件系统只处理 `isTrusted: true` 的原生事件（真正由用户硬件交互触发的）。JavaScript 创建的事件 `isTrusted` 始终为 `false`，React 不会为这些事件触发组件的 `onChange` 回调和后续的 `setState` → re-render 流程。
**你当时的思路：** 认为 `.click()` 能触发 DOM 元素的 click 事件，React 的事件委托在 document 上应该能捕获到。
**为什么错了：** 忽略了 `isTrusted` 属性的安全限制。React 15 虽然在 document 上监听事件，但它内部会检查事件是否由真实用户交互产生。
**修复：** 通过 React 内部的 `_currentElement._owner._instance` 获取组件实例，直接调用 `instance.setState({ selectedCountries: [...] })` + `instance.forceUpdate()` 来更新数据。

### 抽象规则 R1：不要假设 JS 模拟的 DOM 事件能被框架正确处理
> 现代前端框架（React/Vue/Angular）的事件系统可能不响应 JS 模拟的 DOM 事件（`isTrusted: false`）。当需要操作框架管理的数据时，应该直接操作框架的内部状态（如 React 的 setState），而不是试图模拟 DOM 事件。

---

## 错误 #2：`updateCountries` 方法存在于闭包中但不在通过 DOM 找到的组件实例上

**日期：** 2026-04-11
**现象：** 从 `onChange` 源码中看到 `t.updateCountries(n)` 调用，确认组件实例 `t` 有 `updateCountries` 方法。但通过 `textarea → __reactInternalInstance → _owner._instance` 路径找到的组件实例上 `updateCountries` 是 `undefined`。
**根因：** 页面有多层 React 组件嵌套。`onChange` 闭包中的 `t` 是内层组件实例（有 `updateCountries` 方法），而 textarea 的 `_owner._instance` 指向的是外层组件实例（有 `state.selectedCountries` 但没有 `updateCountries`）。
**你当时的思路：** 认为 `t` 和 `_owner._instance` 是同一个组件实例。
**为什么错了：** 没有考虑到组件嵌套关系。`_owner` 指向的是渲染该元素的最近组件，不一定是 `onChange` 闭包中引用的那个。
**修复：** 改用 `setState` + `forceUpdate`（所有 React 组件都有），不依赖 `updateCountries` 这个特定方法。

### 抽象规则 R2：不依赖框架内部的特定方法名，优先使用通用 API
> 当通过反射/内部属性访问框架组件时，不要依赖特定的自定义方法（如 `updateCountries`），因为通过不同路径找到的可能是不同的组件实例。优先使用所有组件都有的通用 API（如 React 的 `setState`/`forceUpdate`）。

---

## 错误 #3：`@updateURL` 路径不匹配实际 GitHub 仓库目录结构

**日期：** 2026-04-11
**现象：** Tampermonkey 检查更新时返回 404，无法自动更新脚本。
**根因：** `@updateURL` 写的是 `main/国家选择器/国家选择器.user.js`（假设文件在子目录里），但实际 git 仓库中文件直接在根目录，正确路径是 `main/国家选择器.user.js`。
**你当时的思路：** 因为本地工作目录叫"国家选择器"，想当然认为 GitHub 上也有同名子目录。
**为什么错了：** 没有用 `git ls-tree` 验证仓库的实际目录结构。
**修复：** 用 `git ls-tree --name-only HEAD` 确认文件在根目录，修正 URL 路径。

### 抽象规则 R3：任何涉及远程路径/URL 的配置，必须先验证实际路径是否存在
> 不要根据本地目录结构推断远程路径。配置 URL 后立即用 curl/fetch 验证返回 200，不要等到用户报告才发现 404。

---

## 错误 #4：mkt EAN 页面被误判为 MODAL 类型

**日期：** 2026-04-11
**现象：** EAN 页面的 checkbox 直接在页面上（不在弹窗里），但脚本把它判定为 MODAL 类型，导致按钮只在弹窗出现时才显示。
**根因：** `detectPageType()` 只检查了 Stormsend 的 `component_instance[countries][]`，其他情况一律返回 `MODAL`。没有考虑到 mkt 站还有非弹窗的表单页面（EAN 页面的 checkbox name 是 `ean[country_codes][]`）。
**你当时的思路：** 认为 mkt 站只有弹窗型交互。
**为什么错了：** 没有穷举所有页面类型，用了 else 兜底返回 MODAL。
**修复：** 新增 `FORM_MKT` 类型，检测 `ean[country_codes][]` checkbox。

### 抽象规则 R4：页面类型检测不能用 else 兜底返回默认值
> 当代码需要区分不同页面/模式时，每种类型都应有明确的正向检测条件。不要用 `else` 返回"默认类型"——如果出现新的、未知的页面，应该不执行任何操作（fail-safe），而不是错误地按默认类型执行。

---

## 错误 #5：中文目录名在 Windows 任务计划程序中编码损坏

**日期：** 2026-04-11
**现象：** 通过 Windows 任务计划程序运行的 PowerShell 脚本，中文路径 `C:\...\国家选择器\` 变成乱码 `C:\...\国家选择器\`，导致脚本找不到文件。
**根因：** Windows 任务计划程序在传递命令行参数时使用系统默认编码（通常是 GBK），与 PowerShell 脚本文件的 UTF-8 编码不兼容，导致中文路径在传递过程中被损坏。
**你当时的思路：** 认为 PowerShell 能正确处理 UTF-8 编码的中文路径。
**为什么错了：** 没有考虑到 Windows 的不同子系统（cmd、PowerShell、任务计划程序）之间的编码转换问题。
**修复：** 最终放弃了任务计划方案，改为手动推送。

### 抽象规则 R5：涉及系统级自动化时，路径中避免使用非 ASCII 字符
> Windows 上的系统级操作（任务计划、注册表、服务）传递路径时，中文/Unicode 字符可能在不同编码环境间损坏。如果必须自动化，把脚本放在纯 ASCII 路径下（如 `C:\AutoPush\`），或使用 8.3 短路径名。

---

## 自检清单（每次改动前必读）

- [ ] R1: 是否在通过 JS 模拟 DOM 事件来操作框架组件？如果是，改用框架内部 API（如 setState）
- [ ] R2: 是否依赖了框架组件的特定方法名？如果是，确认通过当前路径找到的实例确实有该方法
- [ ] R3: 是否配置了远程 URL/路径？如果是，立即验证路径返回 200
- [ ] R4: 页面类型/模式检测是否使用了 else 兜底？如果是，改为每种类型都有正向检测条件
- [ ] R5: 系统级自动化是否涉及非 ASCII 路径？如果是，改用纯 ASCII 路径
