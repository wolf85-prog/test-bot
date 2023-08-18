require("dotenv").config();
const sequelize = require('./../connections/db')
const {Project} = require('./../models/models')
const getBlocks = require('./getBlocks')
const getDatabaseId = require('./getDatabaseId')
//const sendMyMessage = require('./sendMyMessage')
// web-приложение
const webAppUrl = process.env.WEB_APP_URL;
const botApiUrl = process.env.REACT_APP_API_URL;

const {specData} = require('./../data/specData');


//fetch api
const fetch = require('node-fetch');

module.exports = async function getReports(project, bot) {
    console.log('START TEST GET REPORTS: ' + project.id + " " + project.name)

    let count_fio, count_fio2;
    let count_title;
    let i = 0;
    let j = 0;
    let databaseBlock;
    let arr_count, arr_count1, arr_count2, allDate;
    let arr_all = [];
    let all = [];
    let date_db;
    let task1, task2, task3, task4, task5


    // начало цикла Специалисты ----------------------------------------------------------------------
    // 86400 секунд в дне
    var minutCount = 0;
        
    // повторить с интервалом 1 минуту
    let timerId = setInterval(async() => {
        //console.log("Начало цикла отчетов. TimerId: ", timerId)
        minutCount++  // a day has passed
        arr_count = []
        arr_count1 = [] 
        arr_count2 = [] 
        allDate = []
        arr_all = []

        //1)получить блок и бд
        if (project.projectId) {
            const blockId = await getBlocks(project.projectId);
            console.log("i: " + i + " " +  new Date() + " Проект2: " + project.name) 
            databaseBlock = await getDatabaseId(blockId); 
            //console.log("databaseBlock: ", databaseBlock)
        }

        if (databaseBlock) {   
            databaseBlock.map((db) => {
                allDate.push(db.date)           
            })
        }

        //получить уникальные даты из Основного состава по возрастанию
        dates = [...allDate].filter((el, ind) => ind === allDate.indexOf(el));
        const sortedDates = [...dates].sort((a, b) => {       
            var dateA = new Date(a), dateB = new Date(b) 
            return dateA-dateB  //сортировка по возрастающей дате  
        })

        const datesObj = []

        sortedDates.map((item) =>{
            const obj = {
                date: item,
                consilience: true,
            }
            datesObj.push(obj)  
        })

        //2) проверить массив специалистов из ноушен (2-й отчет)
        datesObj.map((item, ind)=> {   
            arr_count2 = []
            specData.map((specObject)=> {
                specObject.models.map((spec)=> {
                    //console.log(spec.name)
                    count_fio = 0;
                    count_title = 0;

                    if (databaseBlock) {   
                        j = 0
                        databaseBlock.map((db) => {
                            if (db.date === item.date) {
                                if (spec.name === db.spec) {
                                    if (db.fio) {
                                        count_fio++               
                                    }else {
                                        count_fio;
                                    } 
                                    count_title++
                                    date_db = db.date
                                } 
                            }                              
                        })

                        //для второго отчета
                        if (count_title > 0) {
                            const obj = {
                                date: date_db,
                                title: spec.name,
                                title2: specObject.icon,
                                count_fio: count_fio,
                                count_title: count_title,
                            }
                            arr_count2.push(obj)        
                        }                  
                        
                    } else {
                        console.log("База данных не найдена! Проект ID: " + project.name)
                        j++ //счетчик ошибок доступа к БД ноушена
                        console.log("Ошибка № " + j)
                        if (j > 10) {
                            console.log("Цикл проекта " + project.name + " завершен!")
                            clearTimeout(timerId);
                        }
                    } 

                })
            })// map spec end

            arr_count.push(arr_count2)

        })

        datesObj.map((item, index) =>{
            arr_all.push(arr_count[index])
        })


        //пропустить пустые массивы
        if (arr_all.length > 0 ) {
            //сохранение массива в 2-х элементный массив
            if (i % 2 == 0) {
                all[0] = arr_all
            } else {
                all[1] = arr_all
            }
        }   
  
        datesObj.map((item, index) =>{
            //console.log(all[0] ? "all0: " + all[0][index] : '')
            //console.log(all[1] ? "all1: " + all[1][index] : '')
            if (all[1] && all[0]) {
               datesObj[index].consilience = JSON.stringify(all[0][index]) === JSON.stringify(all[1][index]);  
            }
            
        }) 
        

        //if (!isEqual) {

            //получить название проекта из ноушена
            let project_name;  
            let project_manager; 
            let project_status;  

            //console.log("ID: ", project.projectId)   

            await fetch(`${botApiUrl}/project/${project.projectId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    project_name = data?.properties.Name.title[0]?.plain_text;
                    project_status = data?.properties["Статус проекта"].select.name
                    project_manager = data?.properties["Менеджер"].relation[0]?.id;

                    //console.log("СТАТУС: ", project_status)
                }  else {
                    project_name = project.name
                    project_manager = '';
                }                             
            });

            //получить TelegramID менеджера проекта из ноушена
            let chatId_manager;
            const chat = await fetch(`${botApiUrl}/managers/${project_manager}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    //console.log("Manager TelegramId: ", data)
                    chatId_manager = data
                } else {
                    console.log("Manager TelegramId не найден!")
                }                             
            });


            //отправить сообщение по каждой дате
            datesObj.forEach(async (date, i)=> {
                const d = new Date(date.date.split('+')[0]);
                const d2 = new Date().getTime() + 10800000

                console.log("consilience: ", date.consilience)

                if (!date.consilience) { 
                    datesObj[i].consilience = true
                    const arr_copy = arr_all[i] 
                    
                    //[...arr_all[i]].filter((item)=> date.date === item.date)
                    //console.log("arr_copy: ", arr_copy)

                    const d = new Date(date.date.split('+')[0]);
                    const month = String(d.getMonth()+1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const chas = d.getHours();
                    const minut = String(d.getMinutes()).padStart(2, "0");

                    const text = `Запрос на специалистов: 
                                
${day}.${month} | ${chas}:${minut} | ${project_name} | U.L.E.Y

${arr_copy.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`                           

                    setTimeout(async()=> {
                        await bot.sendMessage(chatId_manager, project_status)  
                                            
                    }, 1000 * ++i) 
                    
                    //создаю оповещения
                    //var d = new Date();
                    //var d2 = d.getTime() + 10800000

                    var timeDiff = d.getTime() - 7200000; //120 минут
                    var timeDiff2 = d.getTime() - 3600000;//60 минут
                    var timeDiff3 = d.getTime() - 1800000;//30 минут
                    var timeDiff4 = d.getTime() - 900000; //15 минут
                    var timeDiff5 = d.getTime();          //0 минут

                    const date2 = new Date(timeDiff)
                    const date3 = new Date(timeDiff2)
                    const date4 = new Date(timeDiff3)
                    const date5 = new Date(timeDiff4)
                    const date6 = new Date(timeDiff5)
                    const dateNow = new Date(d2)
                    
                    console.log("Дата и время (за 2 часа): ", date2); 
                    console.log("Дата и время (за 1 час): ", date3); 
                    console.log("Дата и время (за 30 минут): ", date4); 
                    console.log("Дата и время (за 15 минут): ", date5); 
                    console.log("Дата и время (за 0 минут): ", date);  

                    // const milliseconds = (timeDiff - Date.now()-120000)/60; //120 минут
                    // const milliseconds2 = (timeDiff2 - Date.now()-120000)/60; //60 минут
                    // const milliseconds3 = (timeDiff3 - Date.now()-120000)/60; //30 минут
                    // const milliseconds4 = (timeDiff4 - Date.now()-120000)/60; //15 минут
                    // const milliseconds5 = (timeDiff5 - Date.now()-120000)/60; //0 минут

                    const milliseconds = Math.floor((date2 - dateNow)); //120 минут
                    const milliseconds2 = Math.floor((date3 - dateNow)); //60 минут
                    const milliseconds3 = Math.floor((date4 - dateNow)); //30 минут
                    const milliseconds4 = Math.floor((date5 - dateNow)); //15 минут
                    const milliseconds5 = Math.floor((date6 - dateNow)); //0 минут

                    console.log("милисекунды", milliseconds, milliseconds2, milliseconds3, milliseconds4, milliseconds5)

                    //отправка напоминания
                    if (project_status === 'Load' || project_status === 'Ready' || project_status === 'On Air') {
                        //1
                        if (task1) {
                            clearTimeout(task1);    
                            console.log("Задача 1 удалена! " + project_name)                       
                        } 
                        console.log("!!!!Планирую запуск сообщения 1...!!!!")     
                        task1 = setTimeout(async() => {
                            await bot.sendMessage(chatId_manager, 'Задача 1: 120 - минутная готовность')  
                        }, milliseconds) 
                        
                        console.log("task1", task1)
                        
                        //2
                        if (task2) {
                            clearTimeout(task2);    
                            console.log("Задача 2 удалена! " + project_name)                       
                        } 
                        console.log("!!!!Планирую запуск сообщения 2...!!!!")     
                        task2 = setTimeout(async() => {
                            await bot.sendMessage(chatId_manager, 'Задача 2: 60 - минутная готовность')  
                        }, milliseconds2) 

                        //3
                        if (task3) {
                            clearTimeout(task3);    
                            console.log("Задача 3 удалена! " + project_name)                       
                        } 
                        console.log("!!!!Планирую запуск сообщения 3...!!!!")     
                        task3 = setTimeout(async() => {
                            await bot.sendMessage(chatId_manager, 'Задача 3: 30 - минутная готовность')  
                        }, milliseconds3) 

                        //4
                        if (task4) {
                            clearTimeout(task4);    
                            console.log("Задача 4 удалена! " + project_name)                       
                        } 
                        console.log("!!!!Планирую запуск сообщения 4...!!!!")     
                        task4 = setTimeout(async() => {
                            await bot.sendMessage(chatId_manager, 'Задача 4: 15 - минутная готовность')  
                        }, milliseconds4) 


                        //5
                        if (task5) {
                            clearTimeout(task5);    
                            console.log("Задача 5 удалена! " + project_name)                       
                        } 
                        console.log("!!!!Планирую запуск сообщения 5...!!!!")     
                        task5 = setTimeout(async() => {
                            await bot.sendMessage(chatId_manager, 'Задача 5: 0 - минутная готовность')  
                        }, milliseconds5) 
                    }
                }
            })
             
        //}// end if

        // сохранить отправленное боту сообщение пользователя в БД 
    
        i++ // счетчик интервалов
    }, 60000); //каждую 1 минуту

    // остановить вывод через 30 дней
    if (minutCount == 43200) {
        clearInterval(timerId);
    }  
}