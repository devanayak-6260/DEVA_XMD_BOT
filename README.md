::: {align="center"}
# 👑 DEVA XMD BOT

### WhatsApp Automation • Node.js • Panel Deployment

**Fast · Simple · Configurable**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Node.js%20Hosting-5865F2)](#-panel-deployment)
[![License](https://img.shields.io/badge/License-See%20Repository-lightgrey)](#-disclaimer)

**Developed by DEVA-NAYAK**
:::

------------------------------------------------------------------------

## 📖 About

**DEVA XMD BOT** is a WhatsApp automation project built with Node.js.
This repository is intended for running the bot on a compatible Node.js
environment, including VPS and hosting panels.

Repository:
[DEVA_XMD_BOT](https://github.com/devanayak-6260/DEVA_XMD_BOT)

> Available commands, integrations, and settings depend on the current
> source code and its configuration.

## ✨ Features

-   🤖 WhatsApp chat automation
-   💬 AutoReply support, if enabled in the project
-   ❤️ Auto-reaction and status-related tools, if configured
-   📥 Media commands and integrations, where supported
-   ⚙️ Configurable command prefix and bot settings
-   🔗 WhatsApp device pairing
-   ☁️ Node.js hosting and panel deployment

Some features may require external APIs or additional configuration.

## 📋 Requirements

-   Node.js 20 or a version compatible with the project's dependencies
-   npm
-   Git
-   A WhatsApp account
-   Internet access
-   A VPS or Node.js-compatible hosting panel

## 🚀 Quick Installation

### 1. Clone the repository

``` bash
git clone https://github.com/devanayak-6260/DEVA_XMD_BOT.git
```

### 2. Enter the project directory

``` bash
cd DEVA_XMD_BOT
```

### 3. Install dependencies

``` bash
npm install
```

### 4. Configure the bot

Review the configuration files included in the repository. If the
project uses `phone.js`, set your WhatsApp number in the format expected
by the source code.

Example:

``` js
module.exports = "91XXXXXXXXXX";
```

Replace the placeholder with your own number, including the country
code, without `+`, spaces, or dashes. Do not publish your personal
number in a public repository.

### 5. Start the bot

``` bash
npm start
```

Follow the connection or pairing instructions displayed by the bot. If a
pairing code is provided, open WhatsApp → **Linked Devices** and follow
the **Link with phone number** flow shown in your WhatsApp app.

## ☁️ Panel Deployment

This section describes a general setup for Node.js hosting panels,
including Pterodactyl-based panels. Panel menus and options may vary by
provider.

### Method A: Deploy the repository directly

1.  Create or open a Node.js server in your hosting panel.

2.  Make sure Git and a compatible Node.js version are available.

3.  Upload the repository files or use the panel's Git deployment
    feature.

4.  Open the server's console or terminal.

5.  Install dependencies:

    ``` bash
    npm install
    ```

6.  Set the startup command to:

    ``` bash
    npm start
    ```

7.  Start the server and complete WhatsApp pairing if prompted.

### Method B: Use a separate GitHub launcher

A launcher can clone or update the repository, install its dependencies,
configure a local phone-number file, and start the bot. Keep the
launcher in the panel's main directory, outside the cloned
`DEVA_XMD_BOT` folder.

If your launcher file is named `index.js`, use this startup command:

``` bash
node index.js
```

The launcher must match the bot's actual configuration format. For
example, writing a `phone.js` file will only work if the bot source code
imports and reads that file. Check the repository before using this
method.

### Recommended server settings

-   **Runtime:** Node.js 20+ (confirm dependency compatibility)
-   **Startup file:** `index.js` for a launcher, or the project's
    configured start command
-   **Install command:** `npm install`
-   **Storage:** Persistent storage for WhatsApp authentication/session
    data
-   **Restart policy:** Enable the hosting panel's restart option if
    available

A script-level restart loop cannot bring the whole server back if the
hosting panel stops or suspends the server. Use the provider's restart
policy and ensure the selected plan permits long-running processes.

## 🔐 Security & Privacy

-   Never share pairing codes, authentication/session folders, API keys,
    or access tokens.
-   Do not upload `.env`, session files, personal phone numbers, or
    credentials to a public GitHub repository.
-   Use environment variables for secrets when supported.
-   Keep authentication data on persistent, private storage.
-   If a token or credential is exposed, revoke it and create a
    replacement.
-   Use automation responsibly and follow WhatsApp's terms and
    applicable laws.

## 🧰 Configuration

Configuration options can differ between repository versions. Review the
actual project files before changing values. Only configure options that
are supported by the installed source code.

After making changes, restart the bot if the project requires it.

## 🛠️ Troubleshooting

  -----------------------------------------------------------------------
  Issue                               What to check
  ----------------------------------- -----------------------------------
  `npm install` fails                 Node.js version, network access,
                                      dependency error output

  Pairing does not complete           Number format, WhatsApp Linked
                                      Devices flow, console logs

  Bot disconnects                     Hosting logs, network stability,
                                      session storage

  Bot restarts repeatedly             Startup command, missing
                                      configuration, runtime errors

  Commands do not respond             Correct prefix, enabled settings,
                                      current source code

  Downloader/API command fails        Third-party API availability and
                                      required configuration
  -----------------------------------------------------------------------

When requesting help, share the relevant error logs but remove phone
numbers, pairing codes, tokens, and session information.

## 🔄 Updating

Stop the running bot before updating an existing clone:

``` bash
git pull
npm install
npm start
```

Back up session and configuration data securely before updating. Avoid
running two copies of the same WhatsApp session simultaneously.

## 🤝 Support & Contributions

For bugs or suggestions, provide a clear description and the relevant
error output. Remove private credentials and account information before
sharing logs.

## ⚠️ Disclaimer

This project is provided for personal automation and learning. You are
responsible for its configuration, account security, and use. Continuous
uptime, third-party API availability, and compatibility with every
hosting provider are not guaranteed. Follow WhatsApp's terms and all
applicable laws.

------------------------------------------------------------------------

::: {align="center"}
### 👑 DEVA XMD BOT

**Developed by DEVA-NAYAK**

*⚡ Powered by DEVA XMD BOT ⚡*
:::
