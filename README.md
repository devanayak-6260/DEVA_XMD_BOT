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

### Option 2: Use the `index.js` installer

If you are using the provided `index.js` setup script, save it in a folder and run:

```bash
node index.js
```

The script clones or updates the bot repository, writes a `phone.js` configuration file, installs dependencies, and runs `npm start`.

**Before running it:** open `index.js` and replace the `PHONE_NUMBER` value with your own WhatsApp number in international format, without `+` or spaces. Do not publish your personal number, pairing codes, API keys, or WhatsApp session files in a public repository. Only link a WhatsApp account you own or are authorized to use.

If the bot folder already exists, make sure the script runs `git pull` from inside that folder; otherwise the update command may fail.

## 🔐 Configuration & Security

1. Review `settings.json` and configure the options for your setup.
2. Put API keys and private configuration in environment variables (for example, in a local `.env` file) instead of committing secrets to GitHub.
3. Add `.env`, WhatsApp session/authentication files, logs, and other credentials to `.gitignore`.
4. Never share your pairing code or WhatsApp session files.

Example `.env` template:

```env
# Add only the credentials your setup actually uses
IMGBB_API_KEY=your_imgbb_api_key
```

**Important:** Before publishing this project, check the source code and `settings.json` for hard-coded API keys or tokens. If any real key has already been uploaded publicly, revoke/rotate it and replace it with an environment variable. Do not upload your `.env` file or WhatsApp authentication/session data.

## 💬 Commands

The project includes commands such as:

| Command | Purpose |
|---|---|
| `menu` | Display the bot menu |
| `ping` | Check bot responsiveness |
| `alive` | Check whether the bot is running |
| `uptime` | Show running time |
| `tomp3` | Audio conversion utility |
| `tts` | Text-to-speech utility |
| `removebg` | Background-removal utility |
| `fullpp` | Profile-picture utility |
| `instagram` | Instagram-related utility |

The exact syntax and availability can depend on the current code and configuration. Send `menu` in the bot chat to view the menu supported by your version.

## ☁️ Deployment

You can run the bot on a computer or a Node.js-compatible hosting service.

1. Upload/clone the project to your server.
2. Use Node.js 20 or newer.
3. Install dependencies with `npm install`.
4. Configure environment variables securely.
5. Start with `npm start`.
6. Keep the process running using a process manager supported by your hosting environment.

Hosting providers have different policies and may stop free services when idle. Check the provider's current rules before deploying.

## 🛠️ Troubleshooting

- **Dependency/install error:** Confirm that Node.js 20+ is installed, then try `npm install`.
- **Bot does not connect:** Check your internet connection and review the terminal logs.
- **Media command fails:** Check required API credentials and third-party service availability.
- **Bot stops after closing the terminal:** Run it on a suitable server or use a process manager.

## 🤝 Contributing

Issues and improvements are welcome. Please avoid submitting API keys, phone numbers, pairing codes, session files, or other private information.

## 📄 License

Choose and add a license before allowing others to reuse or distribute this project. Until a license is added, do not assume that the repository grants permission to redistribute the code.

---

<p align="center">
  <b>Made with ❤️ for the DEVA XMD BOT community</b>
</p>
