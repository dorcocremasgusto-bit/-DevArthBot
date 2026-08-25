import fs from "fs"
import stylizedChar from "./fancy.js"

export default function stylizedCardMessage(text) {
  return {
    text: stylizedChar(text),
    contextInfo: {
      externalAdReply: {
        title: "DevArthBot ",
        body: "𓆩 𝐊𝐋𝐀𝐔𝐒 𝐃𝐄𝐕 (𝐀𝐫𝐭𝐡𝐮𝐫 𝐃𝐞𝐯) 𓆪",
        thumbnail: fs.readFileSync("./database/DigiX.jpg"),
        sourceUrl: "https://whatsapp.com",
        mediaType: 1,
        renderLargerThumbnail: false
      }
    }
  }
}