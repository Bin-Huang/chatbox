<h1 align="center">
<img src='./doc/icon.png' width='30'>
<span>Chatbox</span>
</h1>
<p align="center">
    <a href="./README.md">English</a> | <a href="./README-CN.md">中文介绍</a> | 繁體中文介紹
</p>
<p align="center">
    <em>效率爆棚！Chatbox 是你桌面上的最強 AI 搭檔。一個 GPT/LLM 的桌面客戶端，Prompt 的調試與管理工具，支持 Windows、Mac 和 Linux</em>
</p>


<p align="center">
<a href="https://github.com/Bin-Huang/chatbox/releases" target="_blank">
<img alt="macOS" src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&logoColor=white" />
</a>
<a href="https://github.com/Bin-Huang/chatbox/releases" target="_blank">
<img alt="Windows" src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white" />
</a>
<a href="https://github.com/Bin-Huang/chatbox/releases" target="_blank">
<img alt="Linux" src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white" />
</a>
<a href="https://github.com/Bin-Huang/chatbox/releases" target="_blank">
<img alt="Downloads" src="https://img.shields.io/github/downloads/Bin-Huang/chatbox/total.svg?style=flat" />
</a>
<a href="https://twitter.com/benn_huang" target="_blank">
<img alt="Twitter" src="https://img.shields.io/badge/follow-benn_huang-blue?style=flat&logo=Twitter" />
</a>
</p>

<table>
<tr>
<td>
<img src='./doc/snapshot2.png' />
</td>
<td>
<img src='./doc/snapshot4.png' />
</td>
</tr>
</table>


## 特性

- 更自由、更強大的 Prompt 能力
- 數據存儲在本地，不會丢失
- 内置开箱即用的 AI 服務，API KEY 不是必須的
- 支持 OpenAI(GPT3.5, GPT4), Azure OpenAI 和 ChatGLM-6B
- 支持自定義域名代理
- Markdown 和代碼高亮
- 提示詞圖書館，消息引用
- 流式回覆，打字機特效
- 符合人體工程學的 UI 設計，夜間模式
- 適合團隊辦公，支持在團隊中共享 OpenAI API 資源，[查看教程](./team-sharing/README-TC.md)
- 提供安裝包，無需部署
- 免費，開源

## 下載安裝包

### 官網下載

<table>
  <tr>
    <td style="text-align:center"><b>Windows</b></td>
    <td colspan="2" style="text-align:center"><b>MacOS</b></td>
    <td style="text-align:center"><b>Linux</b></td>
  </tr>
  <tr>
    <td>
      <b><a href='https://chatboxai.app/cn/?c=download-windows'>下載 Setup.exe</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/cn/?c=download-mac-intel'>Mac Intel 安裝包</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/cn/?c=download-mac-aarch'>Mac M1/M2 安裝包</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/cn/?c=download-linux'>AppImage 安裝包</a></b>
    </td>
  </tr>
</table>

### 從 GitHub Releases 下載

訪問 **[GitHub Releases](https://github.com/Bin-Huang/chatbox/releases)** 下載最新版本與歷史版本的安裝包。

## 常見問題與解答

- [Frequently Asked Questions](./FAQ.md)
- [常见问题与解答](./FAQ-CN.md)
- [常見問題與解答](./FAQ-TC.md)
## Chatbox 團隊共享功能

用 AI 來提高團隊生產力，是 Chatbox 的一个重要特性。Chatbox 可以讓你的團隊成員共享同一個 OpenAI API 帳號的資源，同時不會暴露你的 API KEY。

點擊這裡[查看教程](./team-sharing/README-TC.md)。
## 為什麼我開發了 Chatbox？

剛開始我只是在調試一些 prompt，我發現自己非常需要一个簡單好用的 prompt 和接口調試工具，所以我開發了最初版本的 Chatbox。我覺得可能有更多的人需要這樣的工具，所以我把它開源出来。

那時我還不知道會有這麼多人喜歡它。於是我盡量聽取開源社區的反饋，不斷開發和完善它，現在它已經變成了一个非常好用的 AI 桌面應用。現在有很多喜歡 Chatbox 的用戶，他們不僅僅在開發和調試 prompt，而且還使用它来日常聊天，甚至用它來做一些更加有趣的事情，比如利用精心設計的 prompt 讓 AI 扮演各種專業的角色，來輔助他們進行一些日常的工作……

## ChatBox 和 (OpenAI API) 的關係

- ChatBox 僅提供了UI界面幫助你更好的使用 ChatGPT API (OpenAI API). 
- 任何和 ChatGPT API (OpenAI API) 相關的問題，請移步 [platform openai](https://platform.openai.com/)

## Roadmap

- [x] AI 聊天與會話管理
- [x] 聊天消息與會話的本地存儲
- [x] 會話消息内容的格式美化（markdown）
- [x] Streaming 打字機特效
- [x] API Host 配置
- [x] 自動生成標籤頁的標題
- [x] 消息清理的按鈕
- [x] 夜間模式
- [x] 消息的 token 估算
- [x] GPT4 的支持
- [x] 中文（简体、繁体）
- [x] 代碼塊的複製按鈕
- [x] 停止生成的按鈕
- [x] 標籤頁的拖拽排序
- [x] [網頁版本](https://web.chatboxai.app)
- [x] 兼容 Azure OpenAI API
- [x] 更好的 prompt 設置
- [x] Prompt Library
- [x] 内置 AI 服務，開箱即用
- [ ] 可以發送文件，談論文件
- [ ] 可以發送鏈結，談論網頁
- [ ] 移動端（iOS、Android）
- [ ] 跨設備的會話同步
- [ ] threads(就像 Slack 一樣)
- 更多...

## 如何貢獻

歡迎任何形式的貢獻，包括但不限於：

- 提交 pull request
- 提交 feature request
- 提交 bug report
- 提交文檔校訂
- 提交翻譯
- 提交其他任何形式的貢獻
- 提交 issue

請注意：
1. 在提交 issue 之前，請確保沒有重複話題的 issue。
2. 請確保標題足夠的簡潔明了，描述足夠的詳細。

## 請熬夜的開發者喝瓶可樂？

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/benn)

| Paypal | Wechat Pay | Ali Pay |
| --- | --- | --- |
| [**`Paypal`**](https://www.paypal.me/tobennhuang) | <img src="./doc/wechat_pay.JPG" height="240" /> | <img src="./doc/ali_pay.PNG" height="240" /> |

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Bin-Huang/chatbox&type=Date)](https://star-history.com/#Bin-Huang/chatbox&Date)

## 聯繫開發者

- [Twitter](https://twitter.com/benn_huang)
- [Email](mailto:tohuangbin@gmail.com)
- [Blog](https://bennhuang.com)

## License

[GNU General Public License v3.0](./LICENSE)
