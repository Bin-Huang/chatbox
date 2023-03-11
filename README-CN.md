[EN](./README.md) | [中文](./README-CN.md)

ChatBox 是一个开源的 OpenAI API 跨平台桌面客户端。prompt 的调试与管理工具，也可以用来替代 ChatGPT Plus 服务。

![](./doc/demo.png)
![](./doc/demo2.png)

## 为什么需要 ChatBox？

- 直接使用 OpenAI API 是比较困难的，需要了解编程与接口调用，而且用起来不够方便。ChatBox 可以帮助你处理所有的底层调用。
- ChatBox 还帮你在本地保存了所有的聊天记录和 prompt，防止在线服务的数据丢失。
- ChatBox 还可以帮助你设计、调试和管理 prompt，让你更好地操作 AI 模型。

## ChatGPT Plus 的平替（平民替代品）？

可行。比起 ChatGPT Plus，同样来自 OpenAI 的开发者API服务可以得到完全一样的效果，而且还有以下好处：

- 比起 ChatGPT Plus 每月 20 美金的固定收费，开发者 API 是按量付费的，总体使用费用更低
- 开发者 API 可以更加直接地使用 ChatGPT 背后的模型，比如使用更灵活的 prompt 角色调试、参数调试

## 下载

[Download here](https://github.com/Bin-Huang/chatbox/releases)

支持的平台与架构：

- **Mac**: x64, arm64(compatibility with x64 tested)
- **Windows**: x64
- **Linux**: x64

## Roadmap

- [x] AI 聊天与会话管理
- [x] 聊天消息与会话的本地存储
- [x] 会话消息内容的格式美化（markdown）
- [x] Streaming 打字机特效
- [x] API Host 配置
- [ ] Prompt Devtools
- [ ] 中文菜单
- [ ] 代码块的复制按钮
- [ ] 夜间模式
- [ ] 停止生成的按钮
- [ ] 自动生成标签页的标题
- [ ] 标签页的拖拽排序
- [ ] 消息清理的按钮
- More...

## 如何贡献

欢迎任何形式的贡献，包括但不限于：

- 提交 issue
- 提交 pull request
- 提交 feature request
- 提交 bug report
- 提交文档校订
- 提交翻译
- 提交其他任何形式的贡献

## 请我喝杯咖啡

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/benn)

<a style='font-size: 30px' href='https://www.paypal.me/tobennhuang'>Paypal</a>

<img src="./doc/wechat_pay.JPG" width="200" />

<img src="./doc/ali_pay.PNG" width="200" />

## License

MIT
