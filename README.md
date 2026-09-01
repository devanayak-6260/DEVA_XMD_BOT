<div align="center">

# ⚡ DEVA XMD-BOT
### 👑 ULTRA PRO BOT v4.0

<img src="media/menu.jpg" alt="DEVA XMD-BOT Menu" width="700">

**WhatsApp Bot • Node.js + Baileys**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/Version-4.0.0-purple?style=for-the-badge)](#)

</div>

---

## ✨ About

**DEVA XMD-BOT** is a WhatsApp bot with media tools, automation, status controls, owner controls and a professional menu system.

> 👑 **Owner:** DEVA-NAYAK  
> ⚡ **Default Prefix:** `.`  
> 🌐 **Mode:** Public  
> 🟢 **Pairing:** Pairing Code  
> 🕒 **Timezone:** Asia/Kolkata

---

## 🚀 Features

### 🤖 Automation
- Auto React
- Auto Read
- Auto Status Seen
- Auto Status Like
- Always Online
- Auto Call Reject
- Anti Delete
- Auto Typing toggle
- Auto Recording toggle

### 🎨 Media Tools
- Sticker creation
- Video → Sticker
- Sticker → Image
- Image → URL
- Full profile-picture helper
- View-once media helper

### 📥 Download / Media
- Instagram public media
- Pinterest media
- Song/media tools
- APK handler

> **Note:** Third-party downloader features depend on external providers/APIs and may stop working if those providers change.

### ⚙️ Bot Controls
- Public / Private mode
- Live prefix change
- Owner controls
- Settings
- Uptime / status information

---

## 📋 Commands

### ⚡ General
```text
.menu
.ping
.uptime
.settings
```

### 🛠️ Tools
```text
.clear
```

### 🎨 Media
```text
.sticker
.v2sticker
.toimg
.url
.fullpp
.vv
```

### 📥 Download
```text
.insta
.instagram
.pin
.pinterest
.song
.apk
```

### ✨ Auto System
```text
.autoreact on/off
.read on/off
.setreact ❤️🔥👍
.statuslike on/off
.statuslike ❤️🔥
.statusseen on/off
.online on/off
.typing on/off
.recording on/off
.callreject on/off
.antidelete on/off
```

### 🔧 Mode
```text
.mode
.mode public
.mode private
```

### 🔑 Prefix
```text
.prefix
.prefix !
```

### 👑 Owner
```text
.owner
```

---

## 🧩 Installation

### Requirements
- Node.js **20+**
- npm
- WhatsApp account for pairing

### Install
```bash
npm install
```

### Configure `.env`
```env
PHONE_NUMBER=91XXXXXXXXXX
OWNER_NUMBER=91XXXXXXXXXX
PREFIX=.
```

### Start
```bash
npm start
```

The start command runs:
```text
node index.js
```

---

## 🔐 Pairing & Session

This build supports **WhatsApp pairing code**.

If an old session becomes corrupted or authentication errors occur, remove the existing session/auth data and pair the account again.

**Never publish private session credentials, tokens or `.env` secrets in a public repository.**

---

## 🖼️ Menu Preview

The menu image is included here:

```text
media/menu.jpg
```

The bot automatically uses this image when sending the menu if the file exists.

---

## 📁 Project Structure

```text
DEVA XMD-BOT/
├── commands/
├── lib/
├── media/
│   ├── menu.jpg
│   └── ping-thumb.jpg
├── config.js
├── index.js
├── package.json
├── app.json
├── Dockerfile
└── README.md
```

---

## ⚠️ Important

- Keep `.env` and WhatsApp session credentials private.
- Third-party media providers can change or become unavailable.
- Keep Node.js/dependencies updated when compatible.
- Avoid spam or automation that can violate WhatsApp rules or cause account restrictions.

---

## ❤️ Credits

<div align="center">

### 👑 DEVA-NAYAK

**DEVA XMD-BOT — ULTRA PRO**

Made with ❤️ for WhatsApp automation.

</div>
