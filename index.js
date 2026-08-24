const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require("chalk");
const config = require("./config");
const connect = require("./lib/connect");

function formatCode(code) {
  const clean = String(code || "").replace(/[^A-Za-z0-9]/g, "");
  return clean.match(/.{1,4}/g)?.join("-") || String(code || "");
}

async function startBot() {
  console.log(chalk.cyan(`
╔════════════════════════════╗
║      DEVA XMD-BOT          ║
║   Stable Pairing Build     ║
╚════════════════════════════╝
`));

  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);

  let version;
  try {
    const latest = await fetchLatestWaWebVersion();
    version = latest.version;
    console.log(chalk.cyan(`WhatsApp Web version: ${version.join(".")}`));
  } catch (e) {
    console.log(chalk.yellow("Latest WhatsApp Web version fetch failed; using Baileys default."));
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
    qrTimeout: 180000,
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  const number = (process.env.PHONE_NUMBER || "").replace(/\D/g, "");
  let pairingRequested = state.creds.registered;

  const requestPairing = async () => {
    if (pairingRequested || state.creds.registered) return;
    if (!number) {
      console.log(chalk.red("Add PHONE_NUMBER in the server environment."));
      return;
    }
    pairingRequested = true;
    try {
      const code = await sock.requestPairingCode(number);
      console.log(chalk.green(`PAIRING CODE: ${formatCode(code)}`));
      console.log(chalk.yellow("Enter this NEW code immediately in WhatsApp → Linked Devices → Link with phone number."));
    } catch (err) {
      pairingRequested = false;
      console.log(chalk.red("Pairing Code Error:"), err?.message || err);
    }
  };

  sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (!state.creds.registered && (qr || connection === "connecting")) {
      setTimeout(requestPairing, 1200);
    }

    if (connection === "open") {
      console.log(chalk.green("DEVA XMD-BOT Connected ✅"));
      await connect(sock);
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.red(`Connection closed. statusCode: ${status || "unknown"}`));

      if (status === DisconnectReason.loggedOut) {
        console.log(chalk.red("Session logged out. Delete the deva-session folder and pair again."));
        return;
      }

      setTimeout(() => {
        startBot().catch((err) => {
          console.error("Restart error:", err);
          process.exit(1);
        });
      }, 3000);
    }
  });
}

startBot().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
