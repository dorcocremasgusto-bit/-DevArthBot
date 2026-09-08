import express from "express";
import cors from "cors";
import connectToWhatsapp from "./Digix/crew.js";

const app = express();

app.use(cors());
app.use(express.json());


app.get("/pair", async (req, res) => {

    const number = req.query.number;


    if (!number) {
        return res.json({
            error: "Mete nimewo WhatsApp la"
        });
    }


    try {

        console.log(
            "📲 New pairing request:",
            number
        );


        const sock = await connectToWhatsapp(
            async () => {},
            number
        );


        res.json({

            success: true,

            message:
            "Pairing started. Check server terminal for code.",

            number

        });


    } catch (error) {


        console.error(error);


        res.json({

            success: false,

            error:
            "Pairing failed"

        });

    }

});



app.listen(3000, () => {

    console.log(
        "🌐 Pairing API running on port 3000"
    );

});
