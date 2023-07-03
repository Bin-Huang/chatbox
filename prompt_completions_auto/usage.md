![prompt_completions_auto](prompt_completions_auto.gif)

# English.md

## Install google automation driver(must)

https://stackoverflow.com/questions/42478591/python-selenium-chrome-webdriver

https://chromedriver.chromium.org/downloads
Or, u can ask GPT how to download selenium chrome driver

## Requirement(If use Python)

If u don't want to use python,just click prompt_auto.exe，but automation driver is still need!

- download python
- selenium
  - [pip install selenium](https://selenium-python.readthedocs.io/installation.html#installing-python-bindings-for-selenium)
  - [your browser driver](https://sites.google.com/chromium.org/driver/)
- pip install openpyxl
- pip install time

## Usage

This is for English

The file is for [ChatBox](https://web.chatboxai.app/) prompt automation by selenium.
You can put the prompt you want to test in column A of an Excel sheet, and then run the script directly. After about ten minutes, your results will be automatically saved in column B of your Excel sheet.

You don't need to input,than wait,than get.
If you have 100prompt to test,you need to use at least 1hour.

But if You just run it,and than have a rest,than the prompt will auto in ChatBox.  And answer will put in your excel!

- Please watch the  mp4 first
- If you don't want to use python and these Requirement,just run prompt_auto.exe. In origin.xlsx,put your prompt in A column,the answer will show in B column.
- Automate the process of inputting prompts from column A of an Excel sheet into ChatBox, and save the returned results from ChatBox in column B. ChatBox is a convenient platform for using ChatGPT
- This is the py file that can help you get completions automation,and save it to your excel file.
- Of course, this is just an example using ChatBox. If you need GPT automation for other purposes, you can contact me.
- The origin.xlsx is the demo file,please just run the code to know how to use it.
- After you run the py file,you will have 40 seconds to enter your apikey
- After you have known how to use it,than use your own excel's prompt to replace the prompt in this origin.xsl
- The prompt is A column,the completions will generate in B column
- If you need other automation of ChatGPT prompt, u can contact me.
- [contact me](https://space.bilibili.com/364838313?spm_id_from=333.1007.0.0)

# 中文说明.md

## 装自动化驱动(必须)

说明书：https://www.cnblogs.com/lfri/p/10542797.html
下载地址：https://chromedriver.chromium.org/downloads

## Requirement(If use Python)

如果不用Python，可以运行prompt_auto.exe，但是自动化驱动仍然是需要的。

- download python
- selenium
  - [pip install selenium](https://selenium-python.readthedocs.io/installation.html#installing-python-bindings-for-selenium)
  - [your browser driver](https://sites.google.com/chromium.org/driver/)
- pip install openpyxl
- pip install time

## Usage

This is for Chinese

这个项目是用于[ChatBox](https://web.chatboxai.app/) 实现自动化的 By selenium
将想测试的prompt放入excel表的A列，然后直接运行脚本，十分钟左右结果会自动保存在excel表里的B列

如果你要测试prompt，不再需要一条一条测试，输入prompt，等待，看到回答，下一条prompt.

使用prompt_completions_auto,你只需要run这个python文件，然后喝杯咖啡，结果就显示在ChatBox和你的Excel表里面了

- 先看下演示视频
- 如何你不想下载依赖requirement和使用python，直接使用prompt_auto.exe，在origin.xlsx中，把你的答案放在A列，答案会放在B列
- 自动化从Excel表的A列把Prompt输入到ChatBox，然后把ChatBox返回的结果保存在B列（ChatBox是一个比较方便的使用ChatGPT的地方）
- 这个项目可以让你自动化的获得prompt的结果，并把它保存在你的excel表上面
- 当然，只是以ChatBox为例，如果需要其他地方的GPT自动化，可以联系我
- origin.xlsx是演示文件，请直接运行代码。以学会本项目的用法
- 运行代码后，有40秒时间输入你自己的apikey
- 懂得如何使用后，使用您自己的Excel表中的提示来替换origin.xsl文件中的提示(A列)
- Prompt提示词请放在A列，生成的完成结果将出现在B列
- 需要其他网站的ChatGPT的Prompt自动化可以联系我
- [我的主页](https://space.bilibili.com/364838313?spm_id_from=333.1007.0.0)