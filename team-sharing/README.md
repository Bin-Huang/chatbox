# Chatbox Team Sharing

<p align="center">
    English | <a href="./README-CN.md">中文介绍</a>
</p>

Chatbox allows your team members to share the resources of the same OpenAI API account without exposing your API KEY.

The following tutorial will help you quickly set up a shared server. It may involve server login, command-line input, etc. If you are not familiar with these operations, you can ask your technical colleague for help or inquire with ChatGPT. Trust me, it's not difficult.

## 1. Prepare a Server

You can launch a cloud server on platforms such as AWS, Google Cloud, Digital Ocean, Vultr, Oracle Cloud, etc. Please note that the server's network must be able to access openai.com.

## 2. Environment Installation

Log into your server and execute the following command:

```shell
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## 3. Start the Chatbox Shared Server (HTTP)

- Replace `<YOUR_OPENAI_KEY>` with your OpenAI API KEY.
- Run the following command to start the server.

```shell
docker run -p 80:80 -p 443:443 \
-v ./caddy_config:/config -v ./caddy_data:/data \
-e KEY=<YOUR_OPENAI_KEY> \
bensdocker/chatbox-team 
```

Example:

```
docker run -p 80:80 -p 443:443 \
-v ./caddy_config:/config -v ./caddy_data:/data \
-e KEY=sk-xxxxxxxxxxxxxxxxxxx \
bensdocker/chatbox-team 
```

## 4. Start the Chatbox Shared Server (HTTPS, recommended)

If you have a domain name, you can use HTTPS to start the server, so that all conversation messages are encrypted as ciphertext during network transmission, which is more secure in terms of privacy.

- Map the domain to this server (and wait for five minutes for it to take effect);
- Replace `<YOUR_DOMAIN>` with your domain name;
- Replace `<YOUR_OPENAI_KEY>` with your OpenAI API KEY;
- Execute the following command to start the server.

```shell
docker run -p 80:80 -p 443:443 \
-v ./caddy_config:/config -v ./caddy_data:/data \
-e HOST=<YOUR_DOMAIN> \
-e KEY=<YOUR_OPENAI_KEY> \
bensdocker/chatbox-team 
```

Example:

```
docker run -p 80:80 -p 443:443 \
-v ./caddy_config:/config -v ./caddy_data:/data \
-e HOST=proxy.chatbox.run \
-e KEY=sk-xxxxxxxxxxxxxxxxxx \
bensdocker/chatbox-team 
```

## 5. Share the Server Address

- If you run with HTTP, the address is `http://<your_server_IP>:80`;
- If you run with HTTPS, the address is `https://<your_domain_name>`;

Share the server address with your team members. They only need to fill in this address in the API Host field in Chatbox settings, without filling in the API KEY, to share the OpenAI API resources.

![](./demo_http.png)

![](./demo_https.png)
