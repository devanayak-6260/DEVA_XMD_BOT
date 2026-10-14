# 👑 DEVA XMD BOT

<p align="center">
  <img src="assets/deva-menu.png" alt="DEVA XMD BOT" width="420">
</p>

<h1 align="center">👑 DEVA XMD BOT</h1>
<p align="center">
  <b>A WhatsApp automation bot powered by Node.js and Baileys</b><br>
  Utility commands • Media tools • Status features • Pairing-code login
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/Platform-WhatsApp-25D366?logo=whatsapp&logoColor=white" alt="WhatsApp">
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-Add%20your%20license-lightgrey" alt="License">
</p>

---

## ✨ About

**DEVA XMD BOT** is a WhatsApp bot built with Node.js and the Baileys library. It includes utility and media commands, status-related features, and pairing-code authentication.

> **Note:** This is an independent community project and is not affiliated with or endorsed by WhatsApp or Meta.

## 🚀 Features

- 🔗 Pairing-code based WhatsApp linking
- 📋 Menu and bot status commands
- 🖼️ Full profile-picture utility
- 🎨 Background-removal command
- 🎵 Text-to-speech and audio conversion tools
- 📥 Instagram-related utility command
- 💚 Configurable online, status, and auto-reaction settings
- ⚙️ Public/private mode and other settings managed through commands

*Some features may require valid API credentials or may depend on third-party services.*

## 🧰 Requirements

- [Node.js](https://nodejs.org/) **20 or newer**
- npm (included with Node.js)
- A WhatsApp account that you own or are authorized to link
- API keys for any optional third-party services you enable

## 📦 Installation

### Option 1: Install manually

**Requirements:** Git and [Node.js 20+](https://nodejs.org/).

```bash
# 1. Clone the DEVA XMD BOT repository
git clone https://github.com/devanayak-6260/DEVA_XMD_BOT.git

# 2. Enter the project directory
cd DEVA_XMD_BOT

# 3. Install dependencies
npm install

# 4. Start the bot
npm start
```

### Option 2: Run the `index.js` installer

Save the installer below as `index.js` in an empty folder. Install [Node.js 20+](https://nodejs.org/) and Git first, then set `PHONE_NUMBER` to your own WhatsApp number in international format (digits only, no `+` or spaces).

```js
const { execSync, spawn } = require("child_process");
const fs = require("fs");

const REPO = "https://github.com/devanayak-6260/DEVA_XMD_BOT.git";
const PHONE_NUMBER = "916260021735"; // अपना नंबर डालें
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

Run the installer:

```bash
index.js
```
