import configmanager from "../utils/configmanager.js"
import fs from 'fs/promises'
import group from '../commands/group.js'
import block from '../commands/block.js'
import viewonce from '../commands/viewonce.js'
import tiktok from '../commands/tiktok.js'
import play from '../commands/play.js'
import sudo from '../commands/sudo.js'
import tag from '../commands/tag.js'
import take from '../commands/take.js'
import sticker from '../commands/sticker.js'
import img from '../commands/img.js'
import url from '../commands/url.js'
import sender from '../commands/sender.js'
import fuck from '../commands/fuck.js'
import bug from '../commands/bug.js'
import dlt from '../commands/dlt.js'
import save from '../commands/save.js'
import pp from '../commands/pp.js'
import premiums from '../commands/premiums.js'
import reactions from '../commands/reactions.js'
import media from '../commands/media.js'
import set from '../commands/set.js'
import fancy from '../commands/fancy.js'
import react from "../utils/react.js"
import info from "../commands/menu.js"
import { pingTest } from "../commands/ping.js"
import auto from '../commands/auto.js'
import uptime from '../commands/uptime.js'


async function handleIncomingMessage(client, event) {

    try {

        const number = client.user.id.split(':')[0]

        if (!configmanager.config.users[number]) {
            configmanager.config.users[number] = {
                sudoList: [
                    `${number}@s.whatsapp.net`
                ],
                prefix: '.',
                publicMode: true,
                autoreact: false,
                emoji: '🎯'
            }

            configmanager.save()
        }


        const lid = client?.user?.lid
            ? client.user.lid.split(':')[0] + '@lid'
            : ''


        const messages = event.messages

        const userConfig = configmanager.config.users[number]

        const publicMode = userConfig.publicMode
        const prefix = userConfig.prefix

        for (const message of messages) {

            const messageBody =
                (
                    message.message?.extendedTextMessage?.text ||
                    message.message?.conversation ||
                    ''
                ).toLowerCase()


            const remoteJid = message.key.remoteJid


            const approvedUsers = userConfig.sudoList || []


            if (!messageBody || !remoteJid) continue


            console.log(
                '📨 Message:',
                messageBody.substring(0,50)
            )


            auto.autotype(client, message)
            auto.autorecord(client, message)

            await tag.respond(client, message)


            reactions.auto(
                client,
                message,
                userConfig.autoreact,
                userConfig.emoji
            )



            if (
                messageBody.startsWith(prefix) &&
                (
                    publicMode ||
                    message.key.fromMe ||
                    approvedUsers.includes(
                        message.key.participant ||
                        message.key.remoteJid
                    ) ||
                    lid.includes(
                        message.key.participant ||
                        message.key.remoteJid
                    )
                )
            ) {


                const args =
                    messageBody
                    .slice(prefix.length)
                    .trim()
                    .split(/\s+/)


                const command = args[0]



                switch(command) {


                    case 'uptime':
                        await react(client,message)
                        await uptime(client,message)
                        break


                    case 'ping':
                        await react(client,message)
                        await pingTest(client,message)
                        break


                    case 'menu':
                        await react(client,message)
                        await info(client,message)
                        break


                    case 'sticker':
                        await react(client,message)
                        await sticker(client,message)
                        break


                    case 'play':
                        await react(client,message)
                        await play(message,client)
                        break


                    case 'img':
                        await react(client,message)
                        await img(message,client)
                        break


                    case 'tiktok':
                        await react(client,message)
                        await tiktok(client,message)
                        break


                    case 'url':
                        await react(client,message)
                        await url(client,message)
                        break


                    case 'save':
                        await react(client,message)
                        await save(client,message)
                        break


                    case 'sudo':
                        await react(client,message)
                        await sudo.sudo(client,message,approvedUsers)
                        configmanager.save()
                        break


                    case 'delsudo':
                        await react(client,message)
                        await sudo.delsudo(client,message,approvedUsers)
                        configmanager.save()
                        break


                    case 'public':
                        await react(client,message)
                        await set.isPublic(message,client)
                        break


                    case 'setprefix':
                        await react(client,message)
                        await set.setprefix(message,client)
                        break


                    case 'kick':
                        await react(client,message)
                        await group.kick(client,message)
                        break


                    case 'promote':
                        await react(client,message)
                        await group.promote(client,message)
                        break


                    case 'demote':
                        await react(client,message)
                        await group.demote(client,message)
                        break


                    case 'tagall':
                        await react(client,message)
                        await tag.tagall(client,message)
                        break


                    case 'block':
                        await react(client,message)
                        await block.block(client,message)
                        break


                    case 'unblock':
                        await react(client,message)
                        await block.unblock(client,message)
                        break


                    case 'fuck':
                        await react(client,message)
                        await fuck(client,message)
                        break


                    case 'addprem':
                        await react(client,message)
                        await premiums.addprem(client,message)
                        configmanager.saveP()
                        break


                    case 'delprem':
                        await react(client,message)
                        await premiums.delprem(client,message)
                        configmanager.saveP()
                        break

                }

            }


            await group.linkDetection(client,message)

        }


    } catch(err) {

        console.error(
            "❌ Message handler error:",
            err
        )

    }

}


export default handleIncomingMessage
