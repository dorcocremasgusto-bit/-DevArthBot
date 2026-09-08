import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys';
import pino from 'pino';
import fs from 'fs';
import configmanager from '../utils/configmanager.js';

const data = 'sessionData';

async function connectToWhatsapp(handleMessage, customNumber = null) {

    const { version } = await fetchLatestBaileysVersion();
    console.log(version);

    const { state, saveCreds } = await useMultiFileAuthState(data);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        keepAliveIntervalMs: 10000,
        connectTimeoutMs: 60000,
        generateHighQualityLinkPreview: true,
    });


    sock.ev.on('creds.update', saveCreds);


    sock.ev.on('connection.update', async (update) => {

        const { connection, lastDisconnect } = update;


        if (connection === 'close') {

            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.toString() || 'unknown';

            console.log(
                '❌ Disconnected:',
                reason,
                'StatusCode:',
                statusCode
            );


            const shouldReconnect =
                statusCode !== DisconnectReason.loggedOut;


            if (shouldReconnect) {

                console.log('🔄 Reconnecting in 5 seconds...');

                setTimeout(() => {
                    connectToWhatsapp(handleMessage, customNumber);
                }, 5000);

            } else {

                console.log(
                    '🚫 Logged out permanently.'
                );

            }


        } else if (connection === 'connecting') {

            console.log('⏳ Connecting...');


        } else if (connection === 'open') {

            console.log(
                '✅ WhatsApp connection established!'
            );


            try {

                const chatId = `${customNumber || '50943841601'}@s.whatsapp.net`;

                const imagePath = './database/DigixCo.jpg';


                const messageText = `
╔══════════════════╗
 DevArth Mini Bot Connected 🚀
╚══════════════════╝

Digital Crew 243
                `;


                if (fs.existsSync(imagePath)) {

                    await sock.sendMessage(chatId, {
                        image: {
                            url: imagePath
                        },
                        caption: messageText,
                        footer: '💻 Powered by DigiX Crew',
                    });

                }


                console.log(
                    '📩 Welcome message sent!'
                );


            } catch (err) {

                console.log(
                    'Welcome error:',
                    err
                );

            }


            sock.ev.on(
                'messages.upsert',
                async (msg) => handleMessage(sock, msg)
            );

        }

    });



    setTimeout(async () => {


        if (!state.creds.registered) {


            console.log(
                '⚠️ Not logged in. Preparing pairing...'
            );


            try {


                const number = customNumber || 50943841601;


                configmanager.premiums.premiumUser['c'] = {
                    creator: number
                };

                configmanager.saveP();


                configmanager.premiums.premiumUser['p'] = {
                    premium: number
                };

                configmanager.saveP();



                console.log(
                    `🔄 Requesting pairing code for ${number}`
                );


                const code =
                    await sock.requestPairingCode(
                        number,
                        'DEVKLAUS'
                    );


                console.log(
                    '📲 Pairing Code:',
                    code
                );


                setTimeout(() => {


                    configmanager.config.users[number] = {

                        sudoList: [
                            `${number}@s.whatsapp.net`
                        ],

                        tagAudioPath: 'tag.mp3',
                        antilink: true,
                        response: true,
                        autoreact: false,
                        prefix: '.',
                        reaction: '🎯',
                        welcome: false,
                        record: true,
                        type: false,
                        publicMode: false,

                    };


                    configmanager.save();


                }, 2000);



            } catch (e) {

                console.error(
                    '❌ Error while requesting pairing code:',
                    e
                );

            }

        }


    }, 5000);



    return sock;

}


export default connectToWhatsapp;
