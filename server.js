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

        let pairingCode = null;


        await connectToWhatsapp(
            async () => {},
            number,
            (code) => {
                pairingCode = code;
            }
        );


        // tann jiskaske code la disponib
        let count = 0;

        while (!pairingCode && count < 30) {

            await new Promise(resolve =>
                setTimeout(resolve, 1000)
            );

            count++;

        }


        if (!pairingCode) {

            return res.json({
                success: false,
                error: "Pa jwenn pairing code"
            });

        }


        res.json({

            success: true,

            number: number,

            code: pairingCode

        });


    } catch (error) {


        console.error(error);


        res.json({

            success: false,

            error: error.message

        });

    }

});



app.listen(3000, () => {

    console.log(
        "🌐 Pairing API running on port 3000"
    );

});
