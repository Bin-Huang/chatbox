# よくある質問

<p align="center">
    <a href="./FAQ.md">English</a> | <a href="./FAQ-CN.md">中文</a> | 日本語
</p>

まだお探しの答えが見つからない場合は、お気軽に [Issue](https://github.com/Bin-Huang/chatbox/issues/new/choose) もお送りください。

### 1001

#### メッセージの送信に失敗し、`Failed to fetch` と表示されました？

この問題は、Chatbox が設定した AI モデルサーバーに接続できない場合に発生します。現在のネットワーク環境をご確認の上、AI モデルサーバーに正しく接続できるかご確認ください。

OpenAI API をお使いの場合、AI モデルプロバイダとして OpenAI API を選択している場合（AI プロバイダ設定で `OpenAI API` を選択している場合）は、通常、Chatbox が設定した `API HOST` にアクセスできません。デフォルトでは、Chatbox は API HOST として `https://api.openai.com` を使用します。現在のネットワークがこのサービスにアクセスできることを確認してください。

### 1002

#### 以前はすべてうまくいっていたのですが、今はエラーが出続けています: `{"error":{"message":"You exceeded your current quota, please check your plan and billing details`?

以前はすべてうまくいっていたのに、メッセージを送信しようとするたびに次のようなエラーが発生し、サービスを利用できない:

```
{"error":{"message":"You exceeded your current quota, please check your plan and billing details.","type":"insufficient_quota","param":null,"code":null}}
```

この問題は Chatbox とは関係ありませんのでご注意ください。このような場合、あなた自身の OpenAI API アカウントを使用していて、無料枠を使い切ったか、期限切れになっている可能性があります（通常は期限切れが原因です）。サービスを使い続けるには、OpenAI アカウントのダッシュボードにログインし、クレジットカードをリンクする必要があります。OpenAI API アカウントには、クレジットカードに関する多くの要件があります。あなたのカードがこれらの要件を満たしていない場合、自分でこの問題を解決する必要があります（かなりイライラするかもしれません）。

**`Chatbox AI` の使用を検討する:** このような問題に対処したくない場合は、Chatbox に内蔵されている `Chatbox AI` サービスを利用することもできます。このサービスを使えば、手間をかけずに AI 機能を楽しむことができる。設定ページで AI プロバイダーを `Chatbox AI` に設定すると、対応するオプションが表示されます。

### 1003

#### GPT-4 が使えない？

GPT-4 を選択し、メッセージ送信時に同様のエラーメッセージが表示された場合:

```
{"error":{"message":"The model: gpt-4-32k does not exist","type":"invalid_request_error","param":null,"code":"model_not_found"}}
```

この問題は、自分の OpenAI アカウントを使用していて、GPT-4 モデルを選択しているが、OpenAI API アカウントが GPT-4 をサポートしていない場合によく発生します。2023年7月4日より、GPT-4 モデルを使用する前に、すべての OpenAI API アカウントは OpenAI にリクエストを提出する必要があります。申請リンクはこちら: https://openai.com/waitlist/gpt-4-api 。なお、ChatGPT Plus ユーザーであっても、GPT-4 API モデルを使用するにはアクセス申請が必要です。
