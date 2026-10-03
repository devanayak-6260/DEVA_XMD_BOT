# 👑 DEVA XMD BOT

```{=html}
<p align="center">
```
`<b>`{=html}A WhatsApp Automation Bot`</b>`{=html}`<br>`{=html} Fast •
Smart • Easy to Deploy
```{=html}
</p>
```

------------------------------------------------------------------------

## 📌 About

**DEVA XMD BOT** is a WhatsApp automation project built with Node.js. It
is designed to provide useful chat automation, status tools, and bot
commands through a WhatsApp connection.

**Developer:** DEVA-NAYAK\
**Repository:** https://github.com/devanayak-6260/DEVA_XMD_BOT

## ✨ Features

-   🤖 Automated chat replies (AutoReply)
-   ❤️ Auto reactions (where enabled)
-   👀 WhatsApp status-related features
-   📥 Media downloader commands (if configured)
-   🎵 Song command (if configured)
-   ⚙️ Configurable bot settings and command prefix
-   🔗 WhatsApp pairing through a supported connection flow

> Available commands and features depend on the code and configuration
> in the repository. Some features may require external APIs.

## 📋 Requirements

-   Node.js 20 or newer (use the version supported by the project
    dependencies)
-   npm
-   Git
-   A WhatsApp account
-   A computer, VPS, or Node.js-compatible hosting service
-   Internet connection

## 🚀 Quick Start

### 1. Clone the repository

``` bash
git clone https://github.com/devanayak-6260/DEVA_XMD_BOT.git
```

### 2. Open the project folder

``` bash
cd DEVA_XMD_BOT
```

### 3. Install dependencies

``` bash
npm install
```

### 4. Configure the bot

Check the repository for its configuration files and setup instructions.
If the project uses `phone.js`, enter your WhatsApp number in
international format, including the country code, without `+`, spaces,
or dashes.

Example format:

``` js
module.exports = "91XXXXXXXXXX";
```

Replace `91XXXXXXXXXX` with your own number. Do not publish your
personal number or session credentials in a public repository.

### 5. Start the bot

``` bash
npm start
```

Follow the terminal prompts to connect WhatsApp. If the project displays
a pairing code, open WhatsApp → **Linked Devices** → **Link a Device**
and follow the on-screen pairing instructions.

## ☁️ Deploy on a VPS or Hosting

1.  Create a Node.js application or VPS instance.

2.  Upload or clone this repository.

3.  Select a compatible Node.js version (Node.js 20+ is a practical
    starting point).

4.  Install dependencies with `npm install`.

5.  Configure the bot's required settings and environment variables.

6.  Set the startup command to:

    ``` bash
    npm start
    ```

7.  Start the service and complete WhatsApp pairing if prompted.

8.  Enable the hosting provider's process manager or restart option, if
    available.

Keep the bot's session/authentication files on persistent storage. If
the host deletes local files on restart or redeploy, the bot may need to
be paired again.

## 🧰 Optional GitHub Launcher

You can use a separate launcher script to clone or update the
repository, install dependencies, write a local phone configuration, and
start the bot. Keep this launcher outside the cloned bot folder to avoid
overwriting it.

Before running it, replace the placeholder phone number with your own
number. Never commit that number or your authentication/session files to
a public repository.

## ⚙️ Configuration

Configuration filenames and supported options can vary by repository
version. Before changing settings:

-   Review the project's configuration files.
-   Use only options that are implemented by the current code.
-   Keep API keys and tokens in environment variables where supported.
-   Restart the bot after configuration changes, if required.

## 🔐 Security & Privacy

-   Never share your WhatsApp pairing code, session folder, or
    authentication credentials.
-   Do not commit `.env`, session files, personal phone numbers, or API
    keys to GitHub.
-   Use a private repository for sensitive project material.
-   Only use the bot with accounts and groups where you have permission.
-   Follow WhatsApp's terms and applicable laws. Automated messaging can
    affect other users, so avoid spam and unwanted messages.
-   Revoke and replace any API key or token that has accidentally been
    exposed.

## 🛠️ Troubleshooting

**`npm install` fails** - Confirm Node.js and npm are installed and
compatible. - Check the error output for missing system packages or
dependency issues. - Retry only after resolving the reported issue.

**Bot does not connect** - Confirm the server has internet access. -
Check that the phone number is in the expected international format. -
Follow the pairing instructions shown by the running project. - Avoid
running multiple copies of the same session at once.

**Bot stops after some time** - Check the hosting provider's logs,
resource limits, and sleep policy. - Use a process manager or hosting
restart policy where supported. - Ensure the plan allows a continuously
running Node.js process.

**Commands or external downloads do not work** - Check the command
prefix and current project configuration. - Some commands may require
working third-party APIs, which can change or become unavailable. -
Review the terminal logs for the specific error.

## 🔄 Updating

To update an existing clone:

``` bash
git pull
npm install
npm start
```

Stop the existing bot process before starting the updated version. Back
up session and configuration files securely before updating.

## 🤝 Contributing

Suggestions, bug reports, and improvements are welcome. When reporting
an issue, include the error message and relevant logs, but remove phone
numbers, tokens, pairing codes, and session data.

## 📜 Disclaimer

This project is provided for learning and personal automation. You are
responsible for how you use it, protecting your account, and complying
with WhatsApp's terms and applicable laws. No uninterrupted uptime or
third-party API availability is guaranteed.

## 👑 Credits

**DEVA XMD BOT**\
Developed by **DEVA-NAYAK**

```{=html}
<p align="center">
```
`<b>`{=html}⚡ Powered by DEVA XMD BOT ⚡`</b>`{=html}
```{=html}
</p>
```
