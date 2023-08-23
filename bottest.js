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
const botApiUrl = process.env.REACT_APP_API_URL;

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
const {Project} = require('./bottest/models/models');
const getAllProjects = require("./bottest/common/getAllProjects");
const getDatabaseId = require("./bottest/common/getDatabaseId");

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

    //console.log("msg: ", msg)
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
            const project = text.split(' ');
            const project2 = await Project.findOne({ where:{ id: project[1] } }) 

            let project_name;  
            let project_status; 
            let project_manager;

            await fetch(`${botApiUrl}/project/${project2.projectId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    project_name = data?.properties.Name.title[0]?.plain_text;
                    project_status = data?.properties["Статус проекта"].select.name
                    project_manager = data?.properties["Менеджер"].relation[0]?.id;
                }  else {
                    project_name = '';
                    project_manager = '';
                }                             
            });

            await bottest.sendMessage(chatId, project_name) 
            await bottest.sendMessage(chatId, project_status)  
            await bottest.sendMessage(chatId, project_manager)   
                                    

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
            let task1;
            var date = new Date('2023-08-18T20:15');
            var d = new Date();
            var d2 = d.getTime() + 10800000
            
            var timeDiff = date.getTime() - 7200000;
            var timeDiff2 = date.getTime() - 3600000;
            var timeDiff3 = date.getTime() - 1800000;
            var timeDiff4 = date.getTime() - 900000;
            var timeDiff5 = date.getTime();
    

            const date2 = new Date(timeDiff)
            const date3 = new Date(timeDiff2)
            const date4 = new Date(timeDiff3)
            const date5 = new Date(timeDiff4)
            const date_tek = new Date(d2)

            //const milliseconds = Math.floor((date - d));

            const milliseconds = Math.floor((date2 - date_tek));
            const milliseconds2 = Math.floor((date3 - date_tek));
            const milliseconds3 = Math.floor((date4 - date_tek));
            const milliseconds4 = Math.floor((date5 - date_tek));

            console.log("Дата и время: ", date);  
            console.log("Дата и время (за 2 часа): ", date2, diffInDays2); 
            console.log("Дата и время (за 1 час): ", date3, diffInDays3); 
            console.log("Дата и время (за 30 минут): ", date4, diffInDays4); 
            console.log("Дата и время (за 15 минут): ", date5, diffInDays5); 
            console.log("Дата и время (за 0 минут): ", diffInDays); 
            console.log("Текущее Дата и время: ", date_tek); 

            //clearTimeout(tasks1);

            task1 = setTimeout(async() => {
                const data = 'СТАРТ - Задача 1 в ' + date + ' запущена!';
                
                //отправить сообщение в админку
                await bottest.sendMessage(chatId, data) 
                console.log(data)

            }, milliseconds) 

            // tasks[1].task = setTimeout(async() => {
            //     const data = 'СТАРТ - Задача 1 в ' + date + ' запущена!';
                
            //     //отправить сообщение в админку
            //     await bottest.sendMessage(chatId, data) 

            // }, 4000) 

            //clearTimeout(tasks[1].task);

            //console.log("timeoutObj1: ", timeoutObj1)

            //await bottest.sendMessage(chatId, timeoutObj1) 
        }

        //остановить отчет проекта
        if (text.startsWith('/stopreports')) {
            const timerId = text.split(' ');
            clearTimeout(timerId);
        }

        if (text.startsWith('/starttask')) {
           // `${min} ${chas} ${day} ${month} *`
            cron.schedule('8 14 05 08 *', () =>  {
                console.log('Задача 1 в 2023-08-05 14:08:00');
              }, {
                scheduled: true,
                timezone: "Europe/Moscow"
            });
        }
        
        //получить дату с текущим месяцем
        if (text.startsWith('/getNewProjects')) {
            let arr = []
            const d = new Date()
            const arrProjects = await getAllProjects()

            //console.log(JSON.stringify(arrProjects))
            arrProjects.forEach(async(page)=> {
                const blockId = await getBlocks(page.id);
                if (blockId) { 
                    //console.log(blockId)
                    databaseBlock = await getDatabaseId(blockId);  
                    if (databaseBlock) {

                        let project = databaseBlock.find(item => new Date(item.date) >= d)
                        //arr.push(project)
                        console.log(project.date)
                        // databaseBlock.map((main) => {
                        //     if (new Date(main.date) > d) {
                        //         const obj = {
                        //             id: page.id,
                        //             name: page.name,
                        //             date: main.date,
                        //         }
                        //         arr.push(obj)
                        //         //console.log(obj)
                        //     }           
                        // })
                    }
                }
            })
            
            console.log(arr)
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
        
        httpsServer.listen(PORT, async() => {
            console.log('HTTPS Server BotTest running on port ' + PORT);

            //очистить таблицу запланированных задач
            //await Task.truncate();
        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()