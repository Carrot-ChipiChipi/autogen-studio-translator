# autogen-studio-translator
这是一个用于 AutoGen Studio 的界面翻译脚本 (override.js)。 它通过 DOM 观察与文本替换机制，实现 界面字符串的实时映射翻译，让用户能够快速本地化 AutoGen Studio 的前端界面。  主要功能：  支持自定义 key → value 翻译词典。  自动适配单页应用路由与动态内容更新。  跳过长文本、代码区块和输入框，避免误替换。  提供启用/禁用与恢复原文的控制接口。  轻量级、非侵入式、易于扩展。  适用场景：将 AutoGen Studio 前端界面（如 Playground、Gallery、Settings 等）翻译为中文或其他语言。
