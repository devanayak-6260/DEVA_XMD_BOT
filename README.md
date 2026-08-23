# DEVA XMD-BOT — FIXED BUILD

## Features
- Latest WhatsApp Web revision fetched at startup
- Phone-number pairing code
- Always online
- Auto status seen
- Auto status like/reaction
- Auto message reaction
- Auto typing
- Auto recording
- Auto call reject
- `.menu`, `.ping`, `.status`, `.react`
- Reconnect-safe event handlers

## Bot-Hosting setup
1. Upload this ZIP and extract it.
2. Keep Node.js 20+.
3. Create `.env` in the bot root:
   `PHONE_NUMBER=91XXXXXXXXXX`
   `OWNER_NUMBER=91XXXXXXXXXX`
4. Do NOT add `+`, spaces, or `-` to the phone number.
5. Start the server.
6. When `PAIRING CODE:` appears, immediately use WhatsApp → Linked Devices → Link with phone number.
7. If an old `deva-session` exists and the account is stuck/logged out, stop the server, delete `deva-session`, then start again.

## Commands
`.menu` `.ping` `.status` `.react`
