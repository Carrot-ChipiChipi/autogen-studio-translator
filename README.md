# AutoGen Studio 翻译覆盖脚本

> 一个轻量的前端映射翻译脚本，用于在运行时将 AutoGen Studio UI 文本替换成目标语言（例如中文）。

本仓库包含：

- `override.js` — 核心脚本，使用 `MutationObserver` 与文本/属性替换实现实时映射翻译（支持 SPA 路由、动态内容）。
- `index.html` — 示例/打包后的页面（如果你在本地部署或内嵌脚本可直接修改）。

---

## 主要特性

- **词典映射**：通过 `key → value` 的映射表来替换界面文本。优先替换长词以避免被短词覆盖。  
- **动态更新**：监听 DOM 变更并尽可能及时翻译新增或修改的文本。  
- **安全跳过**：会跳过代码块、表单输入、长段落等，以避免误替换。  
- **可控性**：提供启用 / 禁用 / 重建映射的全局接口，支持恢复原文。  

---

## 快速开始（安装与使用）

### 1. 将文件放到项目中

把 `override.js`（以及示例 `index.html`）添加到你的项目目录。通常把脚本放在与 `index.html` 同目录或 `/static` 中。

### 2. 在页面中引入（示例）

如果你可以修改 `index.html`：

```html
<!-- 在页面 <head> 或 <body> 中引入 -->
<script src="/path/to/override.js"></script>
<script>
  // 页面加载完成后启用翻译器（可传入初始映射）
  window.addEventListener('DOMContentLoaded', function(){
    if(window.__AG_STUDIO_TRANSLATOR) {
      window.__AG_STUDIO_TRANSLATOR.enable({
        mappingObj: {
          "Playground": "沙盒 (Playground)",
          "Gallery": "画廊"
        }
      });
    }
  });
</script>
```

如果你无法修改源代码，可使用浏览器扩展（如用户脚本/油猴 Tampermonkey）或开发者工具把 `override.js` 注入到页面中。

### 3. 运行时控制

在浏览器控制台中你可以直接使用全局对象：

```js
// 启用（可传入 mappingObj 追加或覆盖映射）
window.__AG_STUDIO_TRANSLATOR.enable({ mappingObj: { "Run": "运行" } });

// 禁用并恢复原文
window.__AG_STUDIO_TRANSLATOR.disable(true);

// 仅重建/替换映射（不自动启用）
window.__AG_STUDIO_TRANSLATOR.rebuild({ "Save": "保存" });
```

---

## 关于中文映射表

**中文映射表在 `index.html` 文件的第 168 行**（如果你使用我们提供的示例 `index.html`）。

> 说明：你可以直接在该行附近添加或修改 `key: value` 对来更改目标语言或优化译文（例如改进措辞、去掉括号、调整长短等）。

> 如果你把映射保存在 `override.js`（变量 `M`）中，也可以直接编辑 `override.js` 并重新载入页面或在运行时使用 `window.__AG_STUDIO_TRANSLATOR.rebuild(...)` 来应用新的映射。

---

## 配置与注意事项

- `LONG_TEXT_THRESHOLD`：脚本中用于跳过过长文本节点的阈值（默认示例为 80 字符），可在 `override.js` 或你的配置中调整以避免误替换整段说明文本。  
- 脚本会跳过特定标签（如 `SCRIPT`, `STYLE`, `CODE`, `PRE`, `TEXTAREA`, `INPUT` 等）以保持安全。  
- 映射时会尽量使用更稳健的正则（优先使用 Unicode 类和前后断言），在不支持环境下回退为更宽松的匹配策略。  
- 对于多义或上下文敏感的字符串，建议把目标词写得更完整（例如包含前后词或标点），或者在映射中使用较长的 key 以避免误替换。  

---

## 提交与贡献

欢迎提交 Issues 或 Pull Requests：

- 如果你发现漏译/错误替换，请在 PR 中附上示例页面片段和建议调整的映射。  
- 如果你希望加入按语言分文件加载或更复杂的 i18n 支持，可提交设计提案（issue + PR）。

---

## 常见问题（FAQ）

**Q：我修改了 `index.html` 第 168 行但看不到变化，怎么办？**  
A：请确保清除浏览器缓存并刷新页面；如果脚本在运行时被加载，需要重载脚本或在控制台调用 `window.__AG_STUDIO_TRANSLATOR.rebuild(newMapping)` 并触发一次 `enable()` 或 `scheduleProcess`。

**Q：我的页面有大量动态文本，性能如何？**  
A：脚本使用 `MutationObserver` 并做了批量调度、短文本优先处理与容器长度跳过等优化。对于极端动态场景可适当提升 `LONG_TEXT_THRESHOLD` 或减小监视粒度。

---

## 许可证

本仓库建议使用 **GPL v3.0**。

---
