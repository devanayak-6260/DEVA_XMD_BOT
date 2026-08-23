🤖 DEVA XMD-BOT

<p align="center">⚡ A Powerful • Fast • Stable WhatsApp Bot ⚡

DEVA XMD-BOT is a feature-rich WhatsApp bot built with Node.js + Baileys, designed with automatic features, smart controls, utility commands and a clean VIP-style menu.

</p>---

👑 BOT INFORMATION

🔰 Details| 📌 Information
🤖 Bot Name| DEVA XMD-BOT
👑 Developer| DEVA
⚙️ Version| 2.3.0
🟢 Runtime| Node.js 20+
📱 Platform| WhatsApp
🔐 Connection| Pairing Code
🌍 Timezone| Asia/Kolkata

---

✨ FEATURES

🚀 AUTO FEATURES

- 👀 Auto Status Seen
- ❤️ Auto Status Like
- ⚡ Auto React
- 🟢 Always Online
- ⌨️ Auto Typing
- 🎙️ Auto Recording
- 📵 Auto Call Reject
- 🛡️ Anti-Delete

All supported automatic features can be controlled using ON/OFF commands.

---

🛠️ COMMANDS

📌 GENERAL

.menu
.ping
.status
.profile
.info

🖼️ MEDIA TOOLS

.toimg

«Reply to a sticker and use ".toimg" to convert the sticker into an image.»

---

⚙️ AUTO FEATURE CONTROL

Turn any supported feature ON or OFF:

.on <feature>
.off <feature>

🔥 AVAILABLE FEATURES

statusseen
statuslike
react
online
typing
recording
callreject
antidelete

💎 EXAMPLES

.on react
.off react

.on statusseen
.off statusseen

.on antidelete
.off antidelete

.on online
.off online

The settings are saved so the selected ON/OFF state can persist across bot restarts.

---

🛡️ SECURITY & STABILITY

🔐 Pairing Code

Easy WhatsApp connection using a pairing code.

♻️ Auto Reconnect

The bot attempts to reconnect automatically when the connection closes, except when the WhatsApp session has been logged out.

💾 Persistent Settings

Auto-feature settings are stored locally and restored when the bot starts.

🖼️ Menu Fallback

If the menu image is unavailable or fails to send, the bot automatically falls back to a text menu.

⚡ Lightweight

Built with a simple Node.js structure for easy deployment and maintenance.

---

📂 PROJECT STRUCTURE

DEVA-XMD-BOT/
│
├── commands/
│   ├── menu.js
│   ├── ping.js
│   ├── profile.js
│   ├── react.js
│   ├── setauto.js
│   ├── status.js
│   ├── sticker2img.js
│   └── toggle.js
│
├── lib/
│   ├── auto.js
│   ├── antiDelete.js
│   ├── commands.js
│   ├── connect.js
│   ├── functions.js
│   └── settings.js
│
├── media/
│   └── menu.jpg
│
├── config.js
├── index.js
├── package.json
├── Dockerfile
├── app.json
└── README.md

---

💻 REQUIREMENTS

- Node.js 20 or newer
- WhatsApp account
- Internet connection
- A supported Node.js hosting/server environment

---

📦 INSTALLATION

1️⃣ Clone or upload the project

git clone YOUR-REPOSITORY-URL
cd DEVA-XMD-BOT

2️⃣ Install dependencies

npm install

3️⃣ Configure environment variables

Create/configure your ".env" or hosting environment variables:

PHONE_NUMBER=YOUR_WHATSAPP_NUMBER
OWNER_NUMBER=YOUR_OWNER_NUMBER

Use the international country code with the phone number and do not include "+" or spaces if your hosting setup expects digits only.

4️⃣ Start the bot

npm start

5️⃣ Pair WhatsApp

The terminal will display a pairing code.

Open WhatsApp:

WhatsApp
   ↓
Linked Devices
   ↓
Link a Device
   ↓
Link with phone number

Enter the displayed pairing code.

---

🎨 VIP MENU

DEVA XMD-BOT includes a custom menu design containing:

╭━━━〔 ✦ DEVA XMD-BOT ✦ 〕━━━╮

        🤖 DEVA XMD BOT

📌 GENERAL
❯ .menu
❯ .ping
❯ .status
❯ .profile
❯ .info

🛠️ TOOLS
❯ .toimg

⚙️ CONTROL
❯ .on <feature>
❯ .off <feature>

🚀 AUTO FEATURES
◈ Auto Status Seen
◈ Auto Status Like
◈ Auto React
◈ Always Online
◈ Auto Typing
◈ Auto Recording
◈ Auto Call Reject
◈ Anti-Delete

⚡ Fast • Stable • Powerful
👑 Powered By DEVA XMD-BOT

╰━━━━━━━━━━━━━━━━━━━━━━━━╯

---

🧩 CONFIGURATION

Main configuration is available in:

config.js

You can configure:

Bot Name
Owner Name
Owner Number
Command Prefix
Session Name
Auto Features
Reaction Emojis
Timezone

Default command prefix:

.

---

❤️ DEFAULT REACTIONS

The bot can use reactions such as:

❤️
🔥
👍
😍
😂
💯

---

🚀 DEPLOYMENT

The project includes deployment-related files:

Dockerfile
app.json
package.json

This makes the project easier to adapt to compatible Node.js hosting platforms.

---

⚠️ IMPORTANT

- Keep your WhatsApp session/private credentials secure.
- Never publish your ".env" or session credentials publicly.
- Do not share pairing codes with other people.
- Use the bot responsibly and follow WhatsApp's terms and applicable rules.
- Bot behavior can depend on WhatsApp/Baileys compatibility and future platform changes.

---

👑 DEVA XMD-BOT

╔══════════════════════════════════╗
║                                  ║
║        🤖 DEVA XMD-BOT           ║
║                                  ║
║     ⚡ FAST • STABLE • VIP ⚡     ║
║                                  ║
║          👑 BY DEVA              ║
║                                  ║
╚══════════════════════════════════╝

⭐ If you like DEVA XMD-BOT, give the project a Star!

DEVA XMD-BOT — Built for a better WhatsApp bot experience. 🚀
