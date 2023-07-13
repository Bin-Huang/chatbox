<h1 align="center">
<img src='./doc/icon.png' width='30'>
<span>Chatbox</span>
</h1>
<p align="center">
    <a href="./README.md">English</a> | <a href="./README-CN.md">中文介绍</a> | 日本語
</p>
<p align="center">
    <em>デスクトップ上の究極の AI 副操縦士。 <br />Chatbox は Windows、Mac、Linux に対応した GPT/LLM 用デスクトップアプリです。</em>
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

## 特徴

- より自由で強力なプロンプト機能
- データはローカルに保存され、失われません
- API キー不要の組み込み AI サービス
- OpenAI（GPT3.5、GPT4）、Azure OpenAI、ChatGLM-6B のサポート
- カスタムドメインプロキシをサポート
- マークダウンとコードハイライト
- プロンプトライブラリ、メッセージ引用
- ストリーミング返信
- 人間工学に基づいた UI デザインとナイトモード
- チームコラボレーションに適しており、チーム内での OpenAI API リソースの共有をサポートします。[チュートリアル](./team-sharing/README.md)を見る
- インストールパッケージを提供し、デプロイは不要
- フリーでオープンソース

## インストーラーのダウンロード

### 公式サイトからダウンロード

<table>
  <tr>
    <td style="text-align:center"><b>Windows</b></td>
    <td colspan="2" style="text-align:center"><b>MacOS</b></td>
    <td style="text-align:center"><b>Linux</b></td>
  </tr>
  <tr>
    <td>
      <b><a href='https://chatboxai.app/?c=download-windows'>Setup.exe の入手</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/?c=download-mac-intel'>Mac Intel セットアップ</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/?c=download-mac-aarch'>Mac M1/M2 セットアップ</a></b>
    </td>
    <td>
      <b><a href='https://chatboxai.app/?c=download-linux'>AppImage</a></b>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>オンラインを利用</td>
  </tr>
  <tr>
    <td>
      <a href='https://chatboxai.app/#download'>ウェブ版（ベータ版）を試す</a>
    </td>
  </tr>
</table>

### GitHub Releases からダウンロード

**[GitHub Releases](https://github.com/Bin-Huang/chatbox/releases)** にアクセスして、最新版または過去のリリースをダウンロードしてください。

## FAQ

- [Frequently Asked Questions](./FAQ.md)
- [常见问题与解答](./FAQ-CN.md)
- [よくある質問](./FAQ-JA.md)

## Chatbox ボックスチーム共有機能

AI を活用してチームの生産性を高めることは、Chatbox の重要な機能です。

Chatbox は、API KEY を公開することなく、チームメンバーが同じ OpenAI API アカウントのリソースを共有することを可能にします。[チュートリアル](./team-sharing/README.md)を参照してください。

## なぜ Chatbox を作ったのか？

Chatbox を最初に開発したのは、いくつかのプロンプトをデバッグしていて、シンプルで使いやすいプロンプトと API のデバッグツールを必要としていることに気づいたからです。このようなツールを必要としている人がもっといるかもしれないと思ったので、オープンソースにしました。

最初は、こんなに人気が出るとは思いませんでした。オープンソースコミュニティからのフィードバックに耳を傾け、開発と改良を続けました。今では、とても便利な AI デスクトップ・アプリケーションになりました。Chatbox を愛用しているユーザーはたくさんいて、プロンプトの開発やデバッグに使うだけでなく、毎日のチャットにも使っていますし、さらに面白いことに、うまくデザインされたプロンプトを使って、AI にさまざまな専門的な役割を演じさせ、毎日の仕事をアシストさせる...なんてこともしています。

## ロードマップ

- [x] AI チャットとセッション管理
- [x] すべての重要なメッセージデータをローカルに保存
- [x] マークダウン
- [x] ストリーミング返信
- [x] API ホストの設定
- [x] タブのタイトルを自動生成
- [x] メッセージ消去ボタン
- [x] ナイト/ダークモード
- [x] メッセージトークンの推定
- [x] GPT4
- [x] 国際化
- [x] コードブロックのコピーボタン
- [x] AI メッセージ生成停止ボタン
- [x] ドラッグ＆ドロップでタブを並べ替える
- [x] [Web 版](https://web.chatboxai.app)
- [x] Azure OpenAI API との互換性
- [x] プロンプト設定の改善
- [x] プロンプトライブラリ
- [x] 組み込みの AI サービス
- [ ] ファイルと話す
- [ ] URL と話す
- [ ] モバイル（Android、iOS）
- [ ] クロスデバイス同期
- [ ] スレッド（Slackのようなもの）
- などなど...

## コントリビュートの方法

どのような形のコントリビュートでも歓迎します:

- issues の提出
- プルリクエストの提出
- 機能リクエストの提出
- バグレポートの提出
- ドキュメントのリビジョンの提出
- 翻訳の提出
- その他のコントリビュートの提出

## コーヒーをおごる

[!["コーヒーをおごる"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/benn)

| Paypal | Wechat Pay | Ali Pay |
| --- | --- | --- |
| [**`Paypal`**](https://www.paypal.me/tobennhuang) | <img src="./doc/wechat_pay.JPG" height="240" /> | <img src="./doc/ali_pay.PNG" height="240" /> |

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Bin-Huang/chatbox&type=Date)](https://star-history.com/#Bin-Huang/chatbox&Date)

## 連絡

- [Twitter](https://twitter.com/benn_huang)
- [Email](mailto:tohuangbin@gmail.com)
- [ブログ](https://bennhuang.com)

## ライセンス

[GNU General Public License v3.0](./LICENSE)
