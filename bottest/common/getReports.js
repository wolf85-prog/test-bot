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
    let arr_count, arr_count2, allDate;
    let arr_all = [];
    let arr_all2 = [];
    let date_db;


    // начало цикла Специалисты ----------------------------------------------------------------------
    // 86400 секунд в дне
    var minutCount = 0;
        
    // повторить с интервалом 1 минуту
    let timerId = setInterval(async() => {
        minutCount++  // a day has passed
        arr_count = [] 
        arr_count2 = [] 
        allDate = []

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


        //2) проверить массив специалистов из ноушен (2-й отчет)
        specData.map((specObject)=> {
            specObject.models.map((spec)=> {
                //console.log(spec.name)
                count_fio = 0;
                count_title = 0;

                if (databaseBlock) {   
                    j = 0
                    databaseBlock.map((db) => {
                        if (spec.name === db.spec) {
                            if (db.fio) {
                                count_fio++               
                            }else {
                                count_fio;
                            } 
                            count_title++
                            date_db = db.date
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
                        arr_count.push(obj)        
                    }
                     
                    //console.log(arr_count)

                    //сохранение массива в 2-х элементный массив
                    if (i % 2 == 0) {
                        arr_all[0] = arr_count
                    } else {
                        arr_all[1] = arr_count 
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

        console.log(arr_count)

        sortedDates.map((date1, ind)=> {
            //arr_count = []
           // if (date1 === arr_all.)
        })

        //получить название проекта из ноушена
        let project_name;
        
        const res = await fetch(`${botApiUrl}/project/${project.projectId}`)
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                project_name = data?.properties.Name.title[0]?.plain_text;
            }  else {
                project_name = project.name
            }                             
        });

        //получить дату из Основного состава проекта в ноушена
        let project_date = dates[0];

        const d = new Date(project_date);
        const month = String(d.getMonth()+1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const chas = d.getHours();
        const minut = String(d.getMinutes()).padStart(2, "0");

        let isEqual = JSON.stringify(arr_all[0]) === JSON.stringify(arr_all[1]);

        if (!isEqual) {
            //2-й и последующие отчеты
            const text = `Запрос на специалистов: 
                    
${day}.${month} | ${chas}:${minut} | ${project_name} | U.L.E.Y
                
${arr_count.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`                    
            
            //получить менеджера проекта из ноушена
            let project_manager;
            const res = await fetch(`${botApiUrl}/project/${project.projectId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    project_manager = data?.properties.Manager.relation[0]?.id;
                }  else {
                    project_manager = '';
                }                             
            });

            //получить TelegramID менеджера проекта из ноушена
            let chatId_manager;
            const chat = await fetch(`${botApiUrl}/managers/${project_manager}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    console.log("Manager TelegramId: ", data)
                    chatId_manager = data
                } else {
                    console.log("Manager TelegramId не найден!")
                }                             
            });


            sortedDates.forEach((date, i)=> {
                const d = new Date(date.split('+')[0]);
                const month = String(d.getMonth()+1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                const chas = d.getHours();
                const minut = String(d.getMinutes()).padStart(2, "0");

                const text = `Запрос на специалистов: 
                    
${day}.${month} | ${chas}:${minut} | ${project_name} | U.L.E.Y

${arr_count.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`   
                

                setTimeout(async()=> {
                    //await bot.sendMessage(chatId_manager, text) 
                
                }, 1000 * ++i)

            })
             
        }// end if

        // сохранить отправленное боту сообщение пользователя в БД 
    
        i++ // счетчик интервалов
    }, 60000); //каждую 1 минуту

    // остановить вывод через 30 дней
    if (minutCount == 43200) {
        clearInterval(timerId);
    }  



//     if (JSON.parse(project.spec).length > 0) {
//         // начало цикла Специалисты ----------------------------------------------------------------------
//         // 86400 секунд в дне
//         var minutCount = 0;
        
//         // повторить с интервалом 1 минуту
//         let timerId = setInterval(async() => {
//             minutCount++  // a day has passed
//             arr_count = []
//             arr_count2 = [] 

//             //1)получить блок и бд
//             if (project.projectId) {
//                 const blockId = await getBlocks(project.projectId);
//                 console.log("i: " + i + " " +  new Date() + " Проект2: " + project.name) 
//                 databaseBlock = await getDatabaseId(blockId); 
//                 console.log("databaseBlock: ", databaseBlock)
//             }

//             //2) проверить массив специалистов (1-й отчет)
//             JSON.parse(project.spec).map((value)=> {           
//                 count_fio = 0;
//                 count_fio2 = 0;
//                 count_title = 0;

//                 //если бд ноушена доступна
//                 if (databaseBlock) {
//                     j = 0
//                     databaseBlock.map((db) => {
//                         if (value.spec === db.spec) {
//                             if (db.fio) {
//                                 count_fio++               
//                             }else {
//                                 count_fio;
//                             } 
//                         }
//                     })

//                     //для первого отчета
//                     const obj = {
//                         title: value.spec,
//                         title2: value.cat,
//                         count_fio: count_fio,
//                         count_title: value.count,
//                     }
//                     arr_count.push(obj)                  

//                     //сохранение массива в 2-х элементный массив
//                     if (i % 2 == 0) {
//                         arr_all[0] = arr_count
//                     } else {
//                         arr_all[1] = arr_count 
//                     }

//                 } else {
//                     console.log("База данных не найдена! Проект ID: " + project.name)
//                     j++ //счетчик ошибок доступа к БД ноушена
//                     console.log("Ошибка № " + j)
//                     if (j > 10) {
//                         console.log("Цикл проекта " + project.name + " завершен!")
//                         clearTimeout(timerId);
//                     }
//                 }                                          
//             }) // map spec end

//             //3) проверить массив специалистов из ноушен (2-й отчет)
//             if (databaseBlock) {   
//                 databaseBlock.map((db) => {
//                     if (db.fio) {
//                         count_fio2++               
//                     }else {
//                         count_fio2;
//                     } 
//                     count_title++;                

//                     //для второго отчета
//                     const obj2 = {
//                         date: db.date,
//                         title: db.spec,
//                         title2: db.title,
//                         count_fio: count_fio,
//                         count_title: count_title,
//                     }
//                     arr_count2.push(obj2) 

//                     //сохранение массива в 2-х элементный массив
//                     if (i % 2 == 0) {
//                         arr_all2[0] = arr_count2
//                     } else {
//                         arr_all2[1] = arr_count2 
//                     }
//                 })
//             }

//             //получить название проекта из ноушена
//             let project_name;
//             const res = await fetch(
//                  `${botApiUrl}/project/${project.projectId}`
//             )
//             .then((response) => response.json())
//             .then((data) => {
//                 if (data) {
//                     project_name = data?.properties.Name.title[0]?.plain_text;
//                 }  else {
//                     project_name = project.name
//                 }                             
//             });

//             //получить дату из Основного состава проекта в ноушена
//             let project_date = arr_count2[0].date;

//             const d = new Date(project.datestart);
//             const year = d.getFullYear();
//             const month = String(d.getMonth()+1).padStart(2, "0");
//             const day = String(d.getDate()).padStart(2, "0");
//             const chas = d.getHours();
//             const minut = String(d.getMinutes()).padStart(2, "0");

//             const d2 = new Date(project_date);
//             const year2 = d2.getFullYear();
//             const month2 = String(d2.getMonth()+1).padStart(2, "0");
//             const day2 = String(d2.getDate()).padStart(2, "0");
//             const chas2 = d2.getHours();
//             const minut2 = String(d2.getMinutes()).padStart(2, "0");

//             var isEqual = JSON.stringify(arr_all[0]) === JSON.stringify(arr_all[1]);

//             let isEqual2 = JSON.stringify(arr_all2[0]) === JSON.stringify(arr_all2[1]);

//             //отправка сообщения в чат бота
//             if (i < 1) {             
//                 //3) отправить сообщение если есть изменения в составе работников  
//                 if (!isEqual) {
//                     //1-й отчет
//                     const text = `Запрос на специалистов: 
                            
// ${day}.${month} | ${chas}:${minut} | ${project_name} | U.L.E.Y
                        
// ${arr_count.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`
                
//                     await bot.sendMessage(project.chatId, text)  

//                 } // end if
//             } else {
//                 if (!isEqual2) {
//                     //2-й и последующие отчеты
//                     const text2 = `Запрос на специалистов: 
                            
// ${day2}.${month2} | ${chas2}:${minut2} | ${project_name} | U.L.E.Y
                        
// ${arr_count2.map((item, index) =>'0' + (index+1) + '. '+ item.title + ' = ' + item.count_fio + '\/' + item.count_title + ' [' + item.title2 + ']').join('\n')}`                    
                    
//                     //получить менеджера проекта из ноушена
//                     let project_manager;
//                     const res = await fetch(
//                          `${botApiUrl}/project/${project.projectId}`
//                     )
//                     .then((response) => response.json())
//                     .then((data) => {
//                         if (data) {
//                             project_manager = data?.properties.Manager.relation[0]?.id;
//                         }  else {
//                             project_manager = ''
//                         }                             
//                     });
    
//                     //console.log(project_manager)
//                     let chatId_manager;
//                     const chat = await fetch(
//                         `${botApiUrl}/managers/${project_manager}`
//                     )
//                     .then((response) => response.json())
//                     .then((data) => {
//                         if (data) {
//                             console.log("Manager TelegramId: ", data)
//                             chatId_manager = data
//                         }  else {
//                             console.log("Manager TelegramId не найден!")
//                         }                             
//                     });
    
//                     await bot.sendMessage(chatId_manager, text2)  
//                 }// end if
                     
//             }

//             // сохранить отправленное боту сообщение пользователя в БД 
            
//             i++ // счетчик интервалов
//         }, 60000); //каждую 1 минуту

//         // остановить вывод через 30 дней
//         if (minutCount == 43200) {
//             clearInterval(timerId);
//         }   
//     } 




}