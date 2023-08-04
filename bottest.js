require("dotenv").config();

//telegram api
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const router = require('./bottest/routes/index')
const {menuOptions, backOptions} = require('./options')
const path = require('path')

const token = process.env.TELEGRAM_API_TOKEN

//notion api
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const token_fetch = 'Bearer ' + process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID
const databaseAddressId = process.env.NOTION_DATABASE_ADDRESS_ID
const databaseWorkersId = process.env.NOTION_DATABASE_WORKERS_ID
const databaseManagerId = process.env.NOTION_DATABASE_MANAGER_ID

const host = process.env.REACT_APP_API_URL
const chatTelegramId = process.env.CHAT_ID
const chatGiaId = process.env.GIA_CHAT_ID

//планировщик
var cron = require('node-cron');

const bottest = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.resolve(__dirname, 'static')))
app.use('/', router)

const getBlocks= require('./bottest/common/getBlocks')
const getReports = require('./bottest/common/getReports')
const addDate= require('./bottest/common/addDate')
const getProject = require("./bottest/common/getProject");

//подключение к БД PostreSQL
const sequelize = require('./bottest/connections/db')
//const Project = require('./bottest/models/Project')
const {UserBot, Message, Conversation, Project, Report} = require('./bottest/models/models');

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

        // команда Добавить галочку в таблицу Предварительная смета
        if (text === '/addtable') {
            const projectId = 'dbd0cc0d-6c66-4df7-9df8-f46e60b68fad';
            const block1 = await getBlocks(projectId)
            console.log(block1.results[0].id)
            
            const block2 = await getBlocks(block1.results[0].id)
            console.log(block2.results[0].id)
            
            const block3 = await getBlocks(block2.results[0].id)
            console.log(block3.results[0].id)
 
            await addDate(block3.results[0].id);
        }

        // startreports {id проекта}
        if(text.startsWith('/startreports')) {
            const project = text.split(' ');

            const project2 = await Project.findOne({ where:{ id: project[1] } })   
                    
            //начать получать отчеты
            getReports(project2, bottest)
            
        }
        // startreports {id проекта}
        if(text.startsWith('/getProject')) {
            const crmId = await getProject('4412157e9f7c4241bff7db20203ad8c4')
            console.log("crmId: ", crmId)
        }

        // startreports {id проекта}
        if(text.startsWith('/startposter')) {
            //const poster = 'https://proj.uley.team/files/1370/pre/1370_805436270_customer.pdf'
            //const poster = `${host}/files/${crmId}/pre/${crmId}_${chatId}_customer.pdf`
            const poster =  'AgACAgIAAxkBAAIFMmTKTsdHqETQAAEL2fAQQxqdxmyWpQACF80xGxR5WEp4xjlvc39jpgEAAwIAA3kAAy8E';

            //console.log("poster: ", poster)

            //const message = bot.send_document(...)
            //file_id = message.document.file_id

            const fileOptions = {
                // Explicitly specify the MIME type.
                contentType: 'application/pdf',
            };
            
            if (poster) {
                console.log("Отправляю постер...")
                await bottest.sendPhoto(chatId, poster, {
                    reply_markup: ({
                        inline_keyboard:[
                            [{text: 'Подтвердить', callback_data:'/smeta '}]
                        ]
                    })//,
                    //fileOptions
                });
                
            } else {
                console.log("Возникла ошибка при отправке...")
                console.error(error);
            }
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
            const voice = await bottest.getFile(msg.voice.file_id);

            try {
                const res = await fetch(
                    `https://api.telegram.org/bot${token}/getFile?file_id=${voice.file_id}`
                );

                // extract the file path
                const res2 = await res.json();
                const filePath = res2.result.file_path;

                // now that we've "file path" we can generate the download link
                const downloadURL = `https://api.telegram.org/file/bot${token}/${filePath}`;

                https.get(downloadURL,(res) => {
                    const filename = Date.now()
                    // Image will be stored at this path
                    let path;
                    let ras;
                    if(msg.voice) {
                        ras = msg.voice.mime_type.split('/')
                        //path = `${__dirname}/static/${filename}.${ras[1]}`; 
                        path = `${__dirname}/static/${msg.voice.file_unique_id}`; 
                    }
                    const filePath = fs.createWriteStream(path);
                    res.pipe(filePath);
                    filePath.on('finish', async () => {
                        filePath.close();
                        console.log('Download Completed: ', path); 
                        
                        let convId;
                        if(msg.voice) {
                            // сохранить отправленное боту сообщение пользователя в БД
                            convId = await sendMyMessage(`${botApiUrl}/${msg.voice.file_name}`, 'file', chatId, messageId)
                        }

                        // Подключаемся к серверу socket
                        // let socket = io(socketUrl);
                        // socket.emit("addUser", chatId)
                        // socket.emit("sendMessage", {
                        //     senderId: chatId,
                        //     receiverId: chatTelegramId,
                        //     text: `${botApiUrl}/${msg.voice.file_name}`,
                        //     convId: convId,
                        // })
                    })
                })            
            } catch (error) {
                console.log(error.message)
            }
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

            //запуск оповещения (2-х часовая готовность)
            console.log("запуск оповещения (2-х часовая готовность)")
            cron.schedule('*/1 15 04 8 *',()=>{
                console.log('then at 2023-08-04 15:01:00')
            }, {
                scheduled: true,
                timezone: "Europe/Moscow"
            });

            // var task = cron.schedule('* * * * *', () =>  {
            //     console.log('stopped task');
            // }, {
            //     scheduled: false
            // });
              
            // task.start();

        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()