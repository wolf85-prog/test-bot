require("dotenv").config();

//telegram api
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const router = require('./bottest/routes/index')
const {menuOptions, backOptions} = require('./options')

const token = process.env.TELEGRAM_API_TOKEN

//notion api
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const token_fetch = 'Bearer ' + process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID
const databaseAddressId = process.env.NOTION_DATABASE_ADDRESS_ID
const databaseWorkersId = process.env.NOTION_DATABASE_WORKERS_ID
const databaseManagerId = process.env.NOTION_DATABASE_MANAGER_ID

const chatTelegramId = process.env.CHAT_ID
const chatGiaId = process.env.GIA_CHAT_ID

const bottest = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());
app.use('/', router)

const getReports = require('./bottest/common/getReports')

//подключение к БД PostreSQL
const sequelize = require('./bottest/connections/db')
//const Project = require('./bottest/models/Project')
const {UserBot, Message, Conversation, Project, Report} = require('./bottest/models/models')

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

bottest.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const firstname = msg.from.first_name
    const lastname = msg.from.last_name
    const text = msg.text ? msg.text : '';
    const messageId = msg.message_id;

    console.log("msg: ", msg)
    //console.log("text: ", text)

    try {
        // обработка команд
        // команда Старт
        if (text === '/start') {
        
            await bottest.sendMessage(chatId, 'Добро пожаловать в телеграм-бот U.L.E.Y_Test. Смотрите и создавайте проекты U.L.E.Y в ' +
                'web-приложении прямо из мессенджера Telegram.')
        }

        // команда Меню
        if (text === '/menu') {
            await bottest.sendMessage(chatId, 'Смотрите и создавайте проекты U.L.E.Y в web-приложении прямо из мессенджера Telegram.', {
                reply_markup: ({
                    inline_keyboard:[
                        [{text: 'Информация', callback_data:'Информация'}, {text: 'Настройки', callback_data:'Настройки'}],
                        [{text: 'Открыть проекты U.L.E.Y', web_app: {url: 'https://ya.ru'}}],
                    ]
                })
            })
        } 


        // команда Добавить таблицу Претенденты
        if (text === '/addpretendents') {
            const project_id = 'e9fcd9a3-726f-4ae7-bc01-a9d2c84a3e0e'; 
            await newDatabase5(project_id);
        }

        // startreports {id проекта}
        if(text.startsWith('/startreports')) {
            const project = text.split(' ');

            const project2 = await Project.findOne({ where:{ id: project[1] } })   
                    
            //начать получать отчеты
            getReports(project2, bottest)
            
        }

        //получить дату с текущим месяцем
        if (text.startsWith('/getDate')) {
            // текущая дата
            const date = new Date();
            await bottest.sendMessage(chatId, date.getFullYear() + "-0" + ((date.getMonth())+1) + "-01T00:00:00.000")
        }

        //остановить отчет проекта
        if (text.startsWith('/stopreports')) {
            const timerId = text.split(' ');
            clearTimeout(timerId);
        }
        
//----------------------------------------------------------------------------------------------------------------      
        
        //обработка сообщений    
        if ((text || '')[0] !== '/' && text) {       

           if (msg.reply_to_message) {
                if (msg.reply_to_message.photo) {
                    const str = `"${msg.reply_to_message.photo[0].file_unique_id}_reply_${text}"`
                    await bottest.sendMessage(chatId, `Есть пересылаемое фото: "${msg.reply_to_message.photo[0].file_unique_id}_reply_${text}"`)
                    //парсинг строки
                    //const reply = str.split('_reply_');
                    //console.log("Пересылаемое сообщение: ", reply[0]);
                    //console.log("Основное сообщение: ", reply[1]);
                }
                if (msg.reply_to_message.text) {
                    const str = `"${msg.reply_to_message.text}_reply_${text}"`
                    await bottest.sendMessage(chatId, `Есть пересылаемое сообщение: "${msg.reply_to_message.text}_reply_${text}"`)
                    //парсинг строки
                    const reply = str.split('_reply_');
                    console.log("Пересылаемое сообщение: ", reply[0]);
                    console.log("Основное сообщение: ", reply[1]);
                }

            } else {
                await bottest.sendMessage(chatId, `Ваше сообщение "${text}" обрабатывается!`) 
            }

            //const text_full = msg.reply_to_message.text ? `${msg.reply_to_message?.text}_reply_${text}` : `${text}`
            
            // ответ бота
            //await bottest.sendMessage(chatId, `Ваше сообщение "${text_full}" обрабатывается!`)
            //await bottest.sendMessage(chatTelegramId, `${text} \n \n от ${firstname} ${lastname} ${chatId}`)           
        }

        //обработка изображений
        if (msg.photo) {
            await bottest.sendMessage(chatId, `Ваше фото получено!`)
        }

        //обработка аудио сообщений
        if (msg.voice) {
            await bottest.sendMessage(chatId, `Ваше аудио-сообщение получено!`)
        }

        //обработка контактов
        if (msg.contact) {
            await bottest.sendMessage(chatId, `Ваш контакт получен!`)
            const phone = msg.contact.phone_number
            const firstname = msg.contact.first_name
            const lastname = msg.contact.last_name ? msg.contact.last_name : ""
            //const vcard = msg.contact.vcard
            //await bottest.sendContact(chatGiaId, phone, firstname, lastname)  
            const text_contact = `${phone} ${firstname} ${lastname}`
            console.log(text_contact)
        }

    } catch (error) {
        console.log('Произошла непредвиденная ошибка! ', error.message)
    }
    
  });

//Ответ на нажатие кнопок настройки и информаци
    bottest.on('callback_query', msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        const messageId = msg.message.message_id;

        console.log(messageId)
      
        if (data === '/menu') {
            return bottest.sendMessage(chatId, 'Смотрите и создавайте Notion-проекты в web-приложении прямо из мессенджера Telegram.', {
                reply_markup: ({
                    inline_keyboard:[
                        [{text: 'Информация', callback_data:'Информация'}, {text: 'Настройки', callback_data:'Настройки'}],
                        [{text: 'Открыть Notion-проекты', web_app: {url: 'https://ya.ru'}}],
                    ]
                })
            })
        }
    
        bottest.sendMessage(chatId, `Вы нажали кнопку ${data}`, backOptions)
    });

//-------------------------------------------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

const start = async () => {
    try {

        await sequelize.authenticate()
        await sequelize.sync()
        
        httpsServer.listen(PORT, () => {
            console.log('HTTPS Server BotTest running on port ' + PORT);
        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()