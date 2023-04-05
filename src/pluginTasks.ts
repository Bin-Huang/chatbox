import { Message, createMessage, Plugin } from './types';

export interface QueryResult {
  results: Array<{
    query: string;
    results: Array<{
      id: string;
      text: string;
      metadata: {
        source: string;
        source_id: string;
        url: string;
        created_at: string;
        author: string;
        document_id: string;
      };
      embedding: number[];
      score: number;
    }>;
  }>;
}

export async function applyPlugins(
  plugins: Plugin[],
  pluginIDs: string[],
  userMsg: Message
): Promise<Message> {
  let pluginMsg = createMessage("system", "")
  pluginMsg.tags = ["plugin_content"]

  console.log("applyPlugins plugins:", plugins, "pluginIDs:", pluginIDs)

  let ret = plugins.filter((plugin: Plugin) => {return pluginIDs.indexOf(plugin.id) >= 0})
  console.log("applyPlugins return:", ret)

  if (ret && ret.length>0) {
    let content = await applyPlugin(ret[0], userMsg)
    if (content) {
      pluginMsg.content = `可以参考插件获取的如下内容回复用户问题，内容如下：${content}`
    }
  }

  console.log("pluginMsg:", pluginMsg)

  return pluginMsg
}

export async function applyPlugin(
  plugin: Plugin,
  userMsg: Message
): Promise<string> {
  try {
    const response = await fetch(`http://127.0.0.1:8080/sub/query`, {
      method: 'POST',
      headers: {
        'Authorization': `${plugin.auth.authorization_type} ${plugin.auth.authorization_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "queries": [
          {
            "query": userMsg.content,
            "top_k": 3
          }
        ]
      }),
    });

    if (!response.body) {
      throw new Error('No response body')
    }

    let msgContent = '';

    const result = await response.json() as QueryResult
    console.log("query result:", result)

    if (result && result.results) {
      for (let chunk of result.results[0].results) {
        msgContent += chunk.text + "\n"
      }
    }

    return msgContent
  } catch (error) {
    throw error
  }
}
