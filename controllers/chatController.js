const axios = require("axios");

exports.showChat = (req, res) => {

    res.render(
        "chat",
        {
            question: null,
            answer: null
        }
    );

};

exports.askQuestion = async (req, res) => {

    try {

        const question =
            req.body.question;

        const response =
            await axios.post(
                "http://127.0.0.1:5000/chat",
                {
                    question
                }
            );

        const answer =
            response.data.answer;

        res.render(
            "chat",
            {
                question,
                answer
            }
        );

    }
    catch (error) {

        console.log(error);

        res.render(
            "chat",
            {
                question: null,
                answer: "Unable to connect to AI service."
            }
        );

    }

};