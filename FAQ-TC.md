# 常見問題

<p align="center">
    <a href="./FAQ.md">English</a> | <a href="./FAQ-CN.md">中文</a> | 繁體中文
</p>

這裡列舉了一些最常見的問題和解決方案。如果你依然沒有找到答案，也可以提交一个 [Issue](https://github.com/Bin-Huang/chatbox/issues/new/choose)。

### 1001

#### 消息發送失敗，提示 `Failed to fetch`？

這是因為 Chatbox 無法連接到你設置的 AI 模型服務器，請檢查你當前的網路環境，確保可以正常連接到 AI 模型服務器。

對於 OpenAI API 的用戶，如果你選擇了 OpenAI API 作為 AI 模型提供方（即設置頁的 AI Provider 中選擇了 `OpenAI API`），那麼一般是 Chatbox 無法訪問設置的 `API HOST`。在默認設置下，Chatbox 會使用 `https://api.openai.com` 作為 API HOST，請確保你的當前網路可以訪問这个服務。注意，在某些國家和地區是無法直接訪問的。

### 1002

#### 以前用的好好的，突然報錯 `{"error":{"message":"You exceeded your current quota, please check your plan and billing details.`？

如果你以前使用一切正常，某天之後突然無法使用過，並且每次發送消息都報錯：

```
{"error":{"message":"You exceeded your current quota, please check your plan and billing details.","type":"insufficient_quota","param":null,"code":null}}
```

請注意，這個問題和 Chatbox 沒有任何關係。這個情況中往往是因為你正在使用自己的 OpenAI API 帳戶，而你帳戶中的免費额度已經全部用完或過期了（一般都是因為過期導致的）。你需要自行登錄 OpenAI 帳戶的控制台，綁定一張海外信用卡才能繼續使用。OpenAI API 帳戶對信用卡有很多要求，如果你的信用卡不符合要求，那麼你需要自行解決（非常折騰）。

**更推薦使用 `Chatbox AI`：** 如果你不想折騰這些問題，也可以使用 Chatbox 内置的 `Chatbox AI` 服務。這個服務可以讓你無需折騰、什麼都不用管、輕鬆使用 AI 能力。前往配置頁，將 AI Provider 設置為 `Chatbox AI`，你將看到相應的設置。

### 1003

#### 無法使用 GPT-4？

如果你選擇 GPT-4，然後發送消息時得到類似的報錯：

```
{"error":{"message":"The model: gpt-4-32k does not exist","type":"invalid_request_error","param":null,"code":"model_not_found"}}
```

這個情況往往是因為你正在使用自己的 OpenAI 帳戶，你在模型中選擇了 GPT-4，但 OpenAI API 帳戶不支持 GPT-4。截止到2023年07月04日，所有 OpenAI API 帳戶都需要向 OpenAI 填寫申請後才能使用 GPT-4 模型。這裡是申請鏈結： https://openai.com/waitlist/gpt-4-api 。
