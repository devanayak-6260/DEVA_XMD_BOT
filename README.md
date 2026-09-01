# DEVA XMD-BOT — ULTRA PRO 4.0

## Included
- Pairing code + reconnect
- No automatic connected/startup message
- Owner-protected global auto controls
- Anti-delete, status seen/like, auto react, online, typing, recording, call reject
- Sticker, sticker-to-image, image URL, Instagram public post/reel downloader
- Status and owner
- Professional Ultra Pro menu

## Setup
Node.js 20+.
Create `.env`:
`PHONE_NUMBER=91XXXXXXXXXX`
`OWNER_NUMBER=91XXXXXXXXXX`
`PREFIX=.`

Prefix can also be changed live by the owner: `.prefix !`, `.prefix #`, `.prefix rt`, etc. The new prefix is saved in `bot-settings.json` and applies everywhere.

Start with `npm install` then `npm start`.

### Important
Commands that depend on third-party media providers (YouTube/Instagram/Pinterest/Spotify) are intentionally not advertised as working until a provider/API is configured. This avoids fake menu commands and broken downloads.


## Menu/Command sync
The v4.1 VIP menu has been synchronized with the implemented command router. Menu entries now correspond to actual handlers included in this build.


## FULL PP FIX
Use `.fullpp` by replying to a photo. The updated handler preserves the complete
photo instead of putting it on a black `contain` canvas. Because WhatsApp profile
pictures are square, the bot uses a blurred version of the same photo as the
background and places the complete original photo on top, maximizing its visible
size without cropping it.


## Instagram Downloader
Use `.insta <Instagram URL>` or reply to a message containing one or more Instagram links and send `.insta`. Public posts/reels/photos/carousels are handled through the configured public downloader API. Private/login-only media may not work.

### Status Like
- `.statuslike [on/off]` — enable or disable automatic status likes
- `.statuslike emoji 🔥` — set a custom status-like emoji


## Connection / Bad MAC fix
This build disables full history sync, ignores synthetic `requestId` message-upsert events, deduplicates live messages, and prevents overlapping reconnect sockets from sharing the same auth state. If the existing `deva-session` is already corrupted, it must be deleted and the WhatsApp device paired again once.
