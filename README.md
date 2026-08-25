# DEVA XMD-BOT — ULTRA PRO 4.0

## Included
- Pairing code + reconnect
- Owner-protected global auto controls
- Anti-delete, status seen/like, auto react, online, typing, recording, call reject
- Sticker, sticker-to-image, image URL
- Image resize/compress/PNG/JPG conversion
- Group admin tools: kick/add/promote/demote/open/close/tagall/hidetag/groupinfo/admins
- Runtime, ping, status, profile/info, owner
- Professional Ultra Pro menu

## Setup
Node.js 20+.
Create `.env`:
`PHONE_NUMBER=91XXXXXXXXXX`
`OWNER_NUMBER=91XXXXXXXXXX`
`PREFIX=.`

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
