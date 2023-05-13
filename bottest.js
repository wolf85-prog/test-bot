require("dotenv").config();

//telegram api
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const token = process.env.TELEGRAM_API_TOKEN

//notion api
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const token_fetch = 'Bearer ' + process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID
const databaseAddressId = process.env.NOTION_DATABASE_ADDRESS_ID
const databaseWorkersId = process.env.NOTION_DATABASE_WORKERS_ID
const databaseManagerId = process.env.NOTION_DATABASE_MANAGER_ID

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

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const firstname = msg.from.first_name
    const lastname = msg.from.last_name
    const text = msg.text;
    const messageId = msg.message_id;

    //console.log("msg: ", msg)
    //console.log("text: ", text)

    try {
        // обработка команд
        // команда Старт
        if (text === '/start') {
        
            await bot.sendMessage(chatId, 'Добро пожаловать в телеграм-бот U.L.E.Y_Projects. Смотрите и создавайте проекты U.L.E.Y в ' +
                'web-приложении прямо из мессенджера Telegram.', {
                reply_markup: ({
                    inline_keyboard:[
                        [{text: 'Информация', callback_data:'Информация'}, {text: 'Настройки', callback_data:'Настройки'}],
                        [{text: 'Открыть проекты U.L.E.Y', web_app: {url: webAppUrl}}],
                    ]
                })
            })
        }


        // команда Добавить таблицу Претенденты
        if (text === '/addpretendents') {
            const project_id = 'e9fcd9a3-726f-4ae7-bc01-a9d2c84a3e0e'; 
            await newDatabase5(project_id);
        }

        if(text.startsWith('/startreports')) {
            const project = text.split(' ');

            const project2 = await Project.findOne({ where:{ projectId: project[1] } })

            //начать получать отчеты
            console.log('START GET TEST REPORTS ' + project2.name)

            const d = new Date(project2.datestart);
            const year = d.getFullYear();
            const month = String(d.getMonth()+1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const chas = d.getHours();
            const minut = String(d.getMinutes()).padStart(2, "0");

            let count_fio;
            let i = 0;
            let arr_all = [] 

            if (JSON.parse(project2.spec).length > 0) {
                //console.log("Специалисты: ", project2.spec)

                // повторить с интервалом 1 минуту
                let timerId = setInterval(async() => {
                    arr_count = [] 

                    //1)получить блок и бд
                    const blockId = await getBlocks(project2.projectId);
                    console.log("dop! blockId " + i + ": " + blockId + " Проект ID: " + project2.name)
                    
                    let databaseBlock = await getDatabaseId(blockId); 

                    //2) проверить массив специалистов
                    JSON.parse(project2.spec).map((value)=> {                              
                        count_fio = 0;
                        count_title = 0;
                        
                        //если бд ноушена доступна
                        if (databaseBlock) {
                            databaseBlock.map((db) => {
                                if (value.spec === db.spec) {
                                    if (db.fio) {
                                        count_fio++               
                                    }else {
                                        count_fio;
                                    }  
                                }
                            })
                                                                                            
                            const obj = {
                                title: value.spec,
                                title2: value.cat,
                                count_fio: count_fio,
                                count_title: value.count,
                            }
                            arr_count.push(obj) 

                            console.log("arr_count: ", arr_count)

                            //сохранение массива в 2-х элементный массив
                            if (i % 2 == 0) {
                                arr_all[0] = arr_count
                            } else {
                                arr_all[1] = arr_count 
                            }
                        } else {
                            console.log("База данных не найдена! Проект ID: " + project2.name)
                        }                                  
                    }) // map spec end

                    var isEqual = JSON.stringify(arr_all[0]) === JSON.stringify(arr_all[1]);

                    //получить название проекта из ноушена
                    let project_name;
                    const res = await fetch(
                         `${botApiUrl}/project/${project2.projectId}`
                    )
                    .then((response) => response.json())
                    .then((data) => {
                        //console.log("project_name: ", data.properties.Name.title[0]?.plain_text);
                        project_name = data.properties.Name.title[0]?.plain_text;
                    });
                                    
                    //3) отправить сообщение если есть изменения в составе работников     
                    if (!isEqual) {
                        const text = `Запрос на специалистов: 
                                
${day}.${month} | ${chas}:${minut} | ${project_name} | U.L.E.Y
                            
${arr_count.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`
                            
                        //отправка сообщения в чат бота
                        await bot.sendMessage(project2.chatId, text)

                        // сохранить отправленное боту сообщение пользователя в БД
                        const convId = sendMyMessage(text, 'text', project2.chatId, messageId)

                        //Подключаемся к серверу socket
                        let socket = io(socketUrl);
                        socket.emit("addUser", project2.chatId)

                        //отправить сообщение в админку
                        socket.emit("sendMessage", {
                                    senderId: project2.chatId,
                                    receiverId: chatTelegramId,
                                    text: text,
                                    type: 'text',
                                    convId: convId,
                                    messageId: messageId,
                        })
                    } //end if

                    i++ 


                }, 60000); //каждую 1 минуту

            // остановить вывод через 260 минут
            setTimeout(() => { clearInterval(timerId); }, 15600000); //260 минут   
            }
        }
//----------------------------------------------------------------------------------------------------------------      
        
        //обработка сообщений    
        if ((text || '')[0] !== '/' && text) {       

            // ответ бота
            await bot.sendMessage(chatId, `Ваше сообщение "${text}" обрабатывается!`)
            //await bot.sendMessage(chatTelegramId, `${text} \n \n от ${firstname} ${lastname} ${chatId}`)           
        }

    } catch (error) {
        console.log('Произошла непредвиденная ошибка! ', error.message)
    }
    
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