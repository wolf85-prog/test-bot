require("dotenv").config();

//telegram api
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const https = require('https');

const token = process.env.TELEGRAM_API_TOKEN

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Я принял ваш запрос!')
})

//-------------------------------------------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

const start = async () => {
    try {
        
        app.listen(PORT, () => {
            console.log('HTTPS Server BotTest running on port ' + PORT);
        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()