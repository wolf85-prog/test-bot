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
const axios = require("axios");
const { Op } = require('sequelize')

const token = process.env.TELEGRAM_API_TOKEN
const token2 = process.env.TELEGRAM_API_TOKEN_WORK

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
const chatAdminId = process.env.CHAT_ID
const chatGiaId = process.env.GIA_CHAT_ID
const botApiUrl = process.env.REACT_APP_API_URL;

const $host = axios.create({
    baseURL: process.env.REACT_APP_API_URL
})

//socket.io
const {io} = require("socket.io-client")
const socketUrl = process.env.SOCKET_APP_URL

let tasks = []

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
const getSmeta = require("./bottest/common/getSmeta");

//подключение к БД PostreSQL
const sequelize = require('./bottest/connections/db')
const {Plan, Project, Distributionw} = require('./bottest/models/models');
const {Message, Conversation, Worker} = require('./bottest/models/workers')
const getAllProjects = require("./bottest/common/getAllProjects");
const getDatabaseId = require("./bottest/common/getDatabaseId");
const updateSmetaFinal = require("./bottest/common/updateSmetaFinal");

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
            const project_id = 'e04586a0-94ae-49fb-bb69-ea3cf250bc09'; 
            await newDatabase5(project_id);
        }

        // команда Добавить галочку в таблицу Предварительная смета
        if (text === '/addtable') {
            const projectId = 'e04586a0-94ae-49fb-bb69-ea3cf250bc09';
            const block1 = await getBlocks(projectId)
            console.log("block1: ", block1.results[0].id) //первый объект (to do)
            
            const block2 = await getBlocks(block1.results[0].id)
            console.log("block2: ", block2.results[1].id) //второй объект (калькулятор и финальная смета)
            
            const block3 = await getBlocks(block2.results[1].id)
            console.log("block3: ", block3.results[1].id) // второй объект (финальная смета)
 
            await addDate(block3.results[1].id);
        }

        if (text.startsWith('/getSmeta')) {
            const projectId = text.split(' ');
            //найти смету по свойству Проект
            const smetaId = await getSmeta(projectId[1])

            const block1 = await getBlocks(projectId[1])
            console.log("block1: ", block1.results[0].id) //первый объект (to do)
            
            const block2 = await getBlocks(block1.results[0].id)
            console.log("block2: ", block2.results[1].id) //второй объект (калькулятор и финальная смета)
            
            const block3 = await getBlocks(block2.results[1].id)
            console.log("checked: ", block3.results[1].to_do.checked) // второй объект (финальная смета)

            //изменить тег в таб. Сметы в поле Финал. смета на Подтверждена
            await updateSmetaFinal(smetaId)
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

        if (text.startsWith('/getProj')) {
            const projectId = text.split(' ');
            console.log("projectId: ", projectId[1])
            console.log("Начинаю обрабатывать запрос подтверждения финальной сметы...")

            const crmId = await getProject(projectId[1])
            console.log(crmId)
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

            console.log("Запускаю фильтрацию проектов...")

            //console.log(JSON.stringify(arrProjects))
            arrProjects.forEach(async(page)=> {
                const blockId = await getBlocks(page.id);
                if (blockId) { 
                    databaseBlock = await getDatabaseId(blockId);  
                    if (databaseBlock && databaseBlock?.length !== 0) {
                        //console.log(databaseBlock)
                        let project = databaseBlock.find(item => new Date(item.date) >= d)
                        const obj = {
                            id: page.id,
                            name: page.name,
                            date: project.date,
                        }
                        arr.push(obj)
                    }
                }
            })

            setTimeout(()=>{
                console.log("arr: ", arr)
            }, 5000)
            
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


const getDistributionsPlan = async() => {
    console.log("Обновляю план рассылок...")

    const d = new Date();
    const month = String(d.getMonth()+1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date_str = `${day}.${month}`;
    
    d.setDate(d.getDate() + 1);
    const month2 = String(d.getMonth()+1).padStart(2, "0");
    const day2 = String(d.getDate()).padStart(2, "0");
    const date_str2 = `${day2}.${month2}`;
    const year = d.getFullYear();

    //удаление таймеров
    console.log("Запускаю очистку задач...")
    //console.log("tasks: ", tasks)
    tasks.forEach((tmp)=> {
        clearTimeout(tmp)
        //console.log("Задача удалена! ")   
    })

    //console.log("Запускаю планировщик задач...")

    // Подключаемся к серверу socket
    let socket = io(socketUrl);

    //получить запланированные рассылки
    const distributions = await Distributionw.findAll({
        order: [
            ['id', 'ASC'],
        ],
        where: {
            delivered: false
        }
    })

    //console.log("Рассылки:", distributions)

    //рассылки
    distributions.forEach(async (item, index)=> {
        let countSuccess = 0
        const date1 = item.datestart //дата отправки рассылки
        const dateNow = new Date().getTime() + 10800000 //текущая дата
        console.log("date1: ", new Date(date1))
        console.log("dateNow: ", new Date(dateNow))

        const d = new Date(date1);
        const month = String(d.getMonth()+1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        const chas = d.getHours();
        const minut = String(d.getMinutes()).padStart(2, "0");
        const date2 = `${day}.${month}.${year}`
        let arrUsers = []

        const milliseconds = Math.floor(new Date(date1) - new Date(dateNow));       
        console.log("milliseconds: ", milliseconds)

        if (milliseconds > 0) {          
            const objPlan = {
                users: item.users.split(','),
                text: item.text,
                textButton: item.textButton,
                image: item.image,
                time: milliseconds,
                id: item.id,  
                projId: item.projectId, 
                uuid: item.uuid     
            }

            console.log("!!!!Планирую запуск отправки собщения..." + (index+1))
            const timerId = setTimeout(async() => {
               
                objPlan.users.map(async (user, ind) => {
                    setTimeout(async()=> { 
                        console.log("Пользователю ID: " + user + " сообщение " + item.text + " отправлено!")

                        //let conversationId = await getConversation(user)
                        let conversation_id  
                        let sendToTelegram
                        let sendPhotoToTelegram
                        let url_send_photo

                        //по-умолчанию пока сообщение не отправлено
                        arrUsers.push({
                            user: user,
                            status: 500,
                            mess: null,
                        }) 

                        //найти специалиста
                        const blockedWork = await Worker.findOne({
                            where: {
                                chatId: user
                            },
                        })

                        if (blockedWork.dataValues.block !== null && blockedWork.dataValues.block) {
                            console.log("Блок: ", user)
                        } else {
                            //найти беседу
                            const conversation = await Conversation.findOne({
                                where: {
                                    members: {
                                        [Op.contains]: [user]
                                    }
                                },
                            }) 

                            //если нет беседы, то создать 
                            if (!conversation) {
                                const conv = await Conversation.create(
                                {
                                    members: [user, chatAdminId],
                                })
                                console.log("Беседа успешно создана: ", conv) 
                                console.log("conversationId: ", conv.id)
                                
                                conversation_id = conv.id
                            } else {
                                //console.log('Беседа уже создана в БД')  
                                //console.log("conversationId: ", conversation.id)  
                                
                                conversation_id = conversation.id
                            }

                            //получить план из БД
                            const plan = await Plan.findOne({
                                where: {datestart: date2}
                            })
                            
                            const newArray = JSON.parse(plan.dataValues.times)
                            let time1 = `${chas}:${minut}`

                            //обновить план в БД
                            let planer_str
                            let dateIndex = newArray.findIndex((i) => i.time === time1)
                            const datesCopy = JSON.parse(JSON.stringify(newArray));
                            const dateObject = datesCopy[dateIndex];
                            datesCopy[dateIndex] = { ...dateObject, ['go']: true};
                            planer_str = JSON.stringify(datesCopy)

                            const newObj = {
                                "datestart": date2,
                                "times": planer_str
                            }

                            //обновить план в БД
                            const foundItem = await Plan.findOne({ where: {datestart: newObj.datestart} });
                            if (!foundItem) {
                                // Item not found, create a new one
                                const newPlan = await Plan.create(newObj.datestart, newObj.times)
                                //return res.status(200).json(newPlan);
                            } else {
                            // Found an item, update it
                                const item = await Plan.update({times: newObj.times},{where: {datestart: newObj.datestart}});
                            }

                            const projId = item.projectId 
                        
                            let keyboard

                            //Передаем данные боту
                            if (item.button === '') {
                                console.log("textButton: НЕТ")
                                keyboard = JSON.stringify({
                                    inline_keyboard: [
                                        [
                                            {"text": '', callback_data:'/report'},
                                        ],
                                    ]
                                });
                            } else {
                                //console.log("textButton: ", item.button)
                                keyboard = JSON.stringify({
                                    inline_keyboard: [
                                        [
                                            {"text": item.button, web_app: {url: item.target}}, 
                                        ],
                                    ]
                                });
                            }
                    
                            let keyboard2

                            if (item.stavka) {
                                keyboard2 = JSON.stringify({
                                inline_keyboard: [
                                    [
                                        {"text": 'Принять', callback_data:'/accept ' + projId},
                                        {"text": 'Отклонить', callback_data:'/cancel ' + projId},
                                    ],
                                    [
                                        {"text": "Предложить свою ставку", web_app: {url: webAppAddStavka + '/' + projId}},
                                    ],
                                ]
                                });
                            } else {
                                keyboard2 = JSON.stringify({
                                inline_keyboard: [
                                    [
                                        {"text": 'Принять', callback_data:'/accept ' + projId},
                                        {"text": 'Отклонить', callback_data:'/cancel ' + projId},
                                    ],
                                ]
                                });
                            }

                            try {
                                //отправить в телеграмм
                                if (item.text !== '') {
                                    const url_send_msg = `https://api.telegram.org/bot${token2}/sendMessage?chat_id=${user}&parse_mode=html&text=${item.text.replace(/\n/g, '%0A')}`
                                    
                                    sendToTelegram = await $host.get(url_send_msg)
                                        .catch(async(err) => {
                                            if (err.response.status === 403 && err.response.data.description === "Forbidden: bot was blocked by the user") {
                                                await Worker.update({ 
                                                    deleted: true  
                                                },
                                                {
                                                    where: {
                                                        chatId: user,
                                                    },
                                                }) 
                                            }
                                        });

                                    const { status } = sendToTelegram;

                                    if (status === 200) {
                                        countSuccess = countSuccess + 1 
                                        
                                        //обновить статус доставки
                                        arrUsers[ind-1].status = 200 
                                        arrUsers[ind-1].mess = sendToTelegram.data?.result?.message_id    


                                        //обновить бд рассылку
                                        // const newDistrib = await Distributionw.update(
                                        //     { delivered: true,
                                        //         report: JSON.stringify(arrUsers),  
                                        //         success: countSuccess},
                                        //     { where: {id: item.id} }
                                        // )
                                    }
                                } else {
                                    if (item.type === 1) {
                                        url_send_photo = `https://api.telegram.org/bot${token2}/sendPhoto?chat_id=${user}&photo=${item.image}&reply_markup=${item.editButton ? keyboard : keyboard2}`
                                        console.log("url_send_photo2: ", url_send_photo)
                                    } 
                                    else if (item.type === 2) { 
                                        url_send_photo = `https://api.telegram.org/bot${token2}/sendDocument?chat_id=${user}&document=${item.image}&reply_markup=${item.editButton ? keyboard : keyboard2}`
                                        console.log("url_send_photo2: ", url_send_photo)
                                    }
                                    else if (item.type === 3) { 
                                        url_send_photo = `https://api.telegram.org/bot${token2}/sendAudio?chat_id=${user}&audio=${item.image}&reply_markup=${item.editButton ? keyboard : keyboard2}`
                                        console.log("url_send_photo2: ", url_send_photo)
                                    }
                                    else if (item.type === 4) { 
                                        url_send_photo = `https://api.telegram.org/bot${token2}/sendVideo?chat_id=${user}&video=${item.image}&reply_markup=${item.editButton ? keyboard : keyboard2}`
                                        console.log("url_send_photo2: ", url_send_photo)
                                    }
                                    else {
                                        url_send_photo = `https://api.telegram.org/bot${token2}/sendPhoto?chat_id=${user}&photo=${item.image}&reply_markup=${item.editButton ? keyboard : keyboard2}`
                                        console.log("url_send_photo2: ", url_send_photo)
                                    }

                                    sendPhotoToTelegram = await $host.get(url_send_photo)
                                        .catch(async(err) => {
                                            if (err.response.status === 403 && err.response.data.description === "Forbidden: bot was blocked by the user") {
                                                await Worker.update({ 
                                                    deleted: true  
                                                },
                                                {
                                                    where: {
                                                        chatId: user,
                                                    },
                                                }) 
                                            }
                                        });

                                    const { status } = sendPhotoToTelegram;

                                    if (status === 200 && item.text === '') {
                                        countSuccess = countSuccess + 1  
                                        
                                        //обновить статус доставки
                                        arrUsers[ind-1].status = 200 
                                        arrUsers[ind-1].mess = sendPhotoToTelegram.data?.result?.message_id   


                                        // //обновить бд рассылку
                                        // const newDistrib = await Distributionw.update(
                                        //     { delivered: true,
                                        //         report: JSON.stringify(arrUsers),  
                                        //         success: countSuccess},
                                        //     { where: {id: item.id} }
                                        // )
                                    }
                                }
                            
                            } catch (error) {
                                console.log("Ошибка отправки сообщения рассылки...")
                                console.error(error.message)
                            }

                            //отправить в админку
                            let message = {};
                            
                            if(!item.image) {
                                console.log("no file")
                                message = {
                                    senderId: chatAdminId, 
                                    receiverId: user,
                                    conversationId: conversation_id,
                                    type: "text",
                                    text: item.text,
                                    isBot: true,
                                    messageId: sendToTelegram.data?.result?.message_id,
                                    buttons: '',
                                }
                            } else {
                                message = {
                                    senderId: chatAdminId, 
                                    receiverId: user,
                                    conversationId: conversation_id,
                                    type: "image",
                                    text: item.image,
                                    isBot: true,
                                    messageId: sendPhotoToTelegram.data?.result?.message_id,
                                    buttons: item.button ? item.button : '',
                                }
                            }
                            //console.log("message send: ", message);

                            //сохранение сообщения в базе данных wmessage
                            await Message.create(message)

                            //сохранить в контексте
                            if(!item.image) {
                                addNewMessage2(user, item.text, 'text', '', conversation_id, sendToTelegram.data?.result?.message_id, true, socket);
                            } else {
                                addNewMessage2(user, host + item.image, 'image', item.button, conversation_id, sendPhotoToTelegram.data?.result?.message_id, true, socket);
                            }
                        } // end if block 
                        
                        if (ind === (objPlan.users.length-1)) {
                            //обновить бд рассылку
                            const newDistrib = await Distributionw.update(
                                { delivered: true,
                                    report: JSON.stringify(arrUsers),  
                                    success: countSuccess},
                                { where: {id: item.id} }
                            )
                        }
                        
                    }, 1000 * ++ind) 
                
                })
    

            }, milliseconds)

            tasks.push(timerId)
        } 
    })
}

//отправить сообщение из админки workhub
const addNewMessage2 = (userId, message, type, textButton, convId, messageId, isBot, socket) => {

    // Подключаемся к серверу socket
    
    //socket.emit("addUser", userId)
      
    //отправить сообщение в админку
	socket.emit("sendAdminSpec", { 
		senderId: chatAdminId,
		receiverId: userId,
		text: message,
		type: type,
		buttons: textButton,
		convId: convId,
		messageId,
        isBot,
	})
};

//-------------------------------------------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

const start = async () => {
    try {

        await sequelize.authenticate()
        await sequelize.sync()
        
        httpsServer.listen(PORT, async() => {
            console.log('HTTPS Server BotTest running on port ' + PORT);


            // начало цикла получение списка рассылок из планировщика         
            setInterval(async() => {              
                getDistributionsPlan()
            }, 120000) //каждые 2 минуты);   
        });

    } catch (error) {
        console.log('Ошибка!', error.message)
    }
}

start()