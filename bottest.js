require("dotenv").config();

//telegram api
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const token = process.env.TELEGRAM_API_TOKEN

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());

// Certificate
const privateKey = fs.readFileSync('privkey.pem', 'utf8'); //fs.readFileSync('/etc/letsencrypt/live/proj.uley.team/privkey.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8'); //fs.readFileSync('/etc/letsencrypt/live/proj.uley.team/cert.pem', 'utf8');
const ca = fs.readFileSync('chain.pem', 'utf8'); //fs.readFileSync('/etc/letsencrypt/live/proj.uley.team/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};

const httpsServer = https.createServer(credentials, app);

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Я принял ваш запрос!')
})

//-------------------------------------------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

const start = async () => {
    try {
        
        httpsServer.listen(PORT, () => {
            console.log('HTTPS Server BotTest running on port ' + PORT);
        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()