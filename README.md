# 👑 DEVA XMD BOT

### WhatsApp Automation • Node.js • Panel Deployment

**Fast · Simple · Configurable**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![GitHub](https://img.shields.io/badge/GitHub-DEVA__XMD__BOT-181717?logo=github)](https://github.com/devanayak-6260/DEVA_XMD_BOT)

**Developed by DEVA-NAYAK**
:::

------------------------------------------------------------------------

## 📖 About

**DEVA XMD BOT** is a WhatsApp automation project built with Node.js. It
is designed to run on compatible Node.js environments, including VPS and
hosting panels.

**Repository:** https://github.com/devanayak-6260/DEVA_XMD_BOT

> Commands and features depend on the current source code and its
> configuration. Some integrations may require external APIs.

## ✨ Features

-   🤖 WhatsApp chat automation
-   💬 AutoReply support, if enabled
-   ❤️ Auto-reaction and status tools, if configured
-   📥 Media commands and integrations, where supported
-   ⚙️ Configurable settings and command prefix
-   🔗 WhatsApp device pairing
-   ☁️ Node.js and panel deployment

## 📋 Requirements

-   Node.js 20+ or a version compatible with project dependencies
-   npm
-   Git
-   WhatsApp account
-   Internet connection
-   VPS or Node.js-compatible hosting panel

## ☁️ Panel Auto-Deployment (Copy & Deploy)

Use the launcher below when you want the hosting panel to clone the bot
from GitHub, install dependencies, create `phone.js`, and start the bot
automatically.

### 1. Create `index.js`

In your hosting panel's File Manager, create a file named **`index.js`**
in the server's main directory (not inside the cloned bot folder). Copy
the complete script below into it.

### 2. Auto-Deploy Script

``` javascript
const { execSync, spawn } = require("child_process");
const fs = require("fs");

const REPO = "https://github.com/devanayak-6260/DEVA_XMD_BOT.git";
const PHONE_NUMBER = "91XXXXXXXXXX"; // अपना नंबर डालें
const BOT_DIR = "./DEVA_XMD_BOT";

try {
  if (!fs.existsSync(BOT_DIR)) {
    execSync(`git clone ${REPO} ${BOT_DIR}`, { stdio: "inherit" });
  } else {
    execSync("git pull", { cwd: BOT_DIR, stdio: "inherit" });
  }

  fs.writeFileSync(
    `${BOT_DIR}/phone.js`,
    `module.exports = "${PHONE_NUMBER}";\n`
  );

  execSync("npm install", { cwd: BOT_DIR, stdio: "inherit" });

  const bot = spawn("npm", ["start"], {
    cwd: BOT_DIR,
    stdio: "inherit"
  });

  bot.on("exit", code => {
    console.log("Bot stopped with code:", code);
  });
} catch (error) {
  console.error("Error:", error.message);
}
```

### 3. Set Your WhatsApp Number

Find this line in `index.js`:

``` javascript
const PHONE_NUMBER = "91XXXXXXXXXX";
```

Replace `91XXXXXXXXXX` with your WhatsApp number, including country
code, without `+`, spaces, or dashes.

**Example format:** `919876543210`

Do not share or publish your phone number, pairing code, or WhatsApp
session files.

### 4. Panel Startup Settings

In your hosting panel, set the startup command to:

``` bash
node index.js
```

Make sure the panel provides Node.js, npm, and Git. The panel's
installation step should not overwrite your `index.js`.

### 5. Start the Server

Click **Start** in your hosting panel. The script will:

1.  Clone the GitHub repository if it is not present.
2.  Run `git pull` if the repository folder already exists.
3.  Write the configured number to `phone.js`.
4.  Run `npm install` inside the bot folder.
5.  Run `npm start` and display its output in the panel console.

If the bot requests a pairing code, use the connection instructions
displayed in the console and complete linking through WhatsApp →
**Linked Devices**.

> **Important:** This script is the requested basic launcher. It does
> not automatically restart the bot after it exits. Use a
> panel-supported restart policy or process manager if available. Do not
> run multiple copies of the same WhatsApp session.

## 🚀 Manual Installation

If you prefer to deploy the bot directly without the launcher:

### 1. Clone the repository

``` bash
git clone https://github.com/devanayak-6260/DEVA_XMD_BOT.git
```

### 2. Enter the folder

``` bash
cd DEVA_XMD_BOT
```

### 3. Install dependencies

``` bash
npm install
```

### 4. Configure

Review the project's configuration files. If the bot uses `phone.js`,
set the number in the format expected by the source code.

### 5. Start

``` bash
npm start
```

## ⚙️ Configuration

Configuration options can differ between repository versions. Review the
actual source and only set options supported by the current code. Keep
API keys and tokens in environment variables where supported.

## 🔐 Security & Privacy

-   Never share WhatsApp pairing codes, authentication/session folders,
    API keys, or tokens.
-   Do not commit `.env`, session files, personal phone numbers, or
    credentials to a public repository.
-   Keep authentication data on persistent, private storage.
-   If a credential is exposed, revoke it and create a replacement.
-   Use automation responsibly and follow WhatsApp's terms and
    applicable laws.

## 🛠️ Troubleshooting

  -----------------------------------------------------------------------
  Issue                               What to check
  ----------------------------------- -----------------------------------
  `git: command not found`            Ensure Git is installed and
                                      available to the panel

  `npm install` fails                 Check Node.js version, internet
                                      access, and dependency logs

  Pairing fails                       Check number format and WhatsApp's
                                      Linked Devices flow

  Bot stops                           Check console logs, hosting limits,
                                      and restart policy

  Commands do not respond             Check prefix, settings, and current
                                      source code

  API/download command fails          Check external API configuration
                                      and availability
  -----------------------------------------------------------------------

When asking for help, share relevant error logs after removing phone
numbers, pairing codes, tokens, and session data.

## 🔄 Updating

Stop the running bot before updating. For a manual installation:

``` bash
git pull
npm install
npm start
```

The launcher attempts `git pull` when the bot folder already exists.
Back up session and configuration files securely before updating.

## 🤝 Support & Contributions

For bugs or suggestions, provide a clear description and relevant error
output. Remove private credentials and account information before
sharing logs.

## ⚠️ Disclaimer

This project is provided for personal automation and learning. You are
responsible for its configuration, account security, and use. Continuous
uptime, third-party API availability, and compatibility with every
hosting provider are not guaranteed. Follow WhatsApp's terms and all
applicable laws.

------------------------------------------------------------------------

### 👑 DEVA XMD BOT

**Developed by DEVA-NAYAK**

*⚡ Powered by DEVA XMD BOT ⚡*
:::
