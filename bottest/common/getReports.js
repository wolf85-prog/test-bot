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

        console.log("datesObj: ", datesObj)

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
            datesObj[index].consilience = JSON.stringify(all[0] ? all[0][index] : '') === JSON.stringify(all[1] ? all[1][index] : ''); 
        }) 
        

        //console.log(datesObj)

        //if (!isEqual) {

            //получить название проекта из ноушена
            let project_name;        
            await fetch(`${botApiUrl}/project/${project.projectId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data) {
                    project_name = data?.properties.Name.title[0]?.plain_text;
                }  else {
                    project_name = project.name
                }                             
            });
                      
            //получить менеджера проекта из ноушена
            let project_manager;
            await fetch(`${botApiUrl}/project/${project.projectId}`)
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

            //console.log("arr_all: ", arr_all)

            //отправить сообщение по каждой дате
            datesObj.forEach((date, i)=> {
                const d = new Date(date.date.split('+')[0]);
                const d2 = new Date()
                //console.log("Текущая дата: ", new Date())
                //console.log("Дата: ", d)

                if(d > d2) {
                    console.log('первая дата больше текущей');
                } else {
                    console.log('текущая дата больше или даты равны');
                }

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
                        await bot.sendMessage(chatId_manager, text)  
                                            
                    }, 1000 * ++i)   
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