# AutoGen Studio 翻译覆盖脚本

> 轻量且可定制的前端映射翻译方案，用于将 AutoGen Studio 的界面文本替换为目标语言（示例：中文）。

本仓库包含：

* `override.js` — 核心脚本，基于 `MutationObserver` 和稳健匹配规则动态替换页面文本与属性（支持 SPA 路由与动态内容）。
* `index.html` — 示例页面（包含默认中文映射表，方便直接部署到 Autogen Studio 的前端资源目录）。

---

## 核心亮点

* **映射字典**：以 `key → value` 形式配置替换词典，长词优先，减少误替换。
* **实时翻译**：监听并处理 DOM 变更，及时翻译新生成或更新的文本节点。
* **安全策略**：自动跳过代码块、表单输入、超长段落等敏感区域。
* **可控接口**：通过 `window.__AG_STUDIO_TRANSLATOR` 提供启用/禁用/重建映射和恢复原文功能。

---

## 快速部署（推荐永久生效方式）

> **注意**：示例映射表嵌入在 `index.html`（示例文件约在第 168 行）。若要长期生效并对所有启动实例共享，建议将 `index.html` 与 `override.js` 覆盖到运行 Autogen Studio 的 Python 环境里（`site-packages/autogenstudio/web/ui`）。

### 1. 找到前端资源目录（在你实际运行 autogenstudio 的 Python 环境中执行）

```bash
python -c "import autogenstudio, os; print(os.path.join(os.path.dirname(autogenstudio.__file__), 'web','ui'))"
```

记下输出路径，例如：`/home/user/.venv/lib/python3.12/site-packages/autogenstudio/web/ui`

### 2. 备份原始文件（非常重要）

```bash
UIPATH=/path/to/site-packages/autogenstudio/web/ui
mkdir -p "$UIPATH/backup-$(date +%Y%m%d%H%M%S)"
cp "$UIPATH/index.html" "$UIPATH/override.js" "$UIPATH/backup-$(date +%Y%m%d%H%M%S)/" || true
```

### 3. 覆盖文件

将仓库中的 `index.html` 与 `override.js` 复制到上一步的目录（确保在同一 Python 环境）：

```bash
cp ./index.html "$UIPATH/index.html"
cp ./override.js "$UIPATH/override.js"
```

如果是系统级安装，可能需要管理员权限（`sudo`）。

### 4. 重启 Autogen Studio

停止当前进程，然后重新启动：

```bash
autogenstudio ui --port 8081
```

打开浏览器访问对应地址，确认界面是否已按映射显示。

---

## 临时注入（仅作调试/测试）

如果不能访问服务器文件系统，可通过浏览器控制台或用户脚本临时启用：

```js
window.__AG_STUDIO_TRANSLATOR && window.__AG_STUDIO_TRANSLATOR.enable({
  mappingObj: { "Playground": "沙盒", "Gallery": "画廊" }
});
```

此方法适合快速验证，但不保证覆盖 `index.html` 内嵌的默认映射，也不适合长期部署。

---

## 关于中文映射表

* 示例 `index.html` 中的中文映射表位于第 **168 行** 附近（呈现为多项 `"key": "value"` 对），或者直接搜索注释：//中文映射表。
* 你可以直接编辑该处来调整或优化翻译，也可以将映射拆分为 `mappings/*.json` 并在 `override.js` 中 `fetch` 加载以便维护。

---

## 配置与注意事项

* `LONG_TEXT_THRESHOLD`（默认 80）：用于跳过过长文本节点，避免误替换整段内容。可根据页面特性调整。
* 跳过标签：`SCRIPT, STYLE, CODE, PRE, TEXTAREA, INPUT` 等，防止改动非界面文本。
* 匹配策略：优先使用 Unicode 字符类与前后断言，兼容性差时会回退为更宽松策略。
* 上下文敏感项：对多义短词建议使用更长的 key 或包含上下文以降低误替换风险。

---

## 回滚（恢复官方原始界面）

1. 停止 Autogen Studio。
2. 将备份目录中的 `index.html` 与 `override.js` 复制回 `site-packages/autogenstudio/web/ui`。
3. 重启服务。

---

## 贡献与建议

欢迎提交 Issues 或 Pull Requests：

* 增加或改进语言包（例如 zh-Hans、zh-Hant）。
* 提升匹配精确度或性能优化。
* 增加自动化安装/回滚脚本以简化部署流程。

---

## 许可证

本仓库采用 **GPL v3.0** 许可证。

---


