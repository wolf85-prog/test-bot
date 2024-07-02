const { Distribution, Distributionw }= require('../models/models')
const {Message, Conversation, Worker} = require('../models/workers')

const { Op } = require('sequelize')

//fetch api
//const fetch = require('node-fetch');
const axios = require("axios");

const token = process.env.TELEGRAM_API_TOKEN_WORK
const chatAdminId = process.env.CHAT_ID

const $host = axios.create({
    baseURL: process.env.REACT_APP_API_URL
})

//socket.io
const {io} = require("socket.io-client")
const socketUrl = process.env.SOCKET_APP_URL

class DistributionController {

    //send message
    async sendDistribW(req, res) {
        const {id, type} = req.params  

        let arrUsers = []
        let countSuccess = 0

        // Подключаемся к серверу socket
        let socket = io(socketUrl);
        //socket.emit("addUser", user)

        try {
            let exist=await Distributionw.findOne( {where: {id: id}} )
            
            if(!exist){
                res.status(500).json({msg: "distrib not exist"});
                return;
            }

            const selected = exist.dataValues.users.split(',')
            const valueProject = exist.dataValues.projectId
            const textButton = exist.dataValues.button
            const text = exist.dataValues.text
            const image = exist.dataValues.image
            const editButton = exist.dataValues.editButton
            const stavkaButton = exist.dataValues.stavka
            const target = exist.dataValues.target

            //console.log("selected: ", selected)

            selected.map(async (user, index) => {      
                setTimeout(async()=> { 
                
                    console.log(index + " Пользователю ID: " + user + " сообщение отправляется!")
                    let  conversation_id  

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
                            conversation_id = conversation.id
                        }

                        //Передаем данные боту
                        let keyboard
                        if (textButton === '') {
                            console.log("textButton: НЕТ")
                            keyboard = JSON.stringify({
                                inline_keyboard: [
                                    [
                                        {"text": '', callback_data:'/report'},
                                    ],
                                ]
                            });
                        } else {
                            //console.log("textButton: ...")
                            keyboard = JSON.stringify({
                                inline_keyboard: [
                                    [
                                        {"text": textButton, web_app: {url: target}}, 
                                    ],
                                ]
                            });
                        }

                        let keyboard2

                        if (stavkaButton) {
                            keyboard2 = JSON.stringify({
                            inline_keyboard: [
                                [
                                    {"text": 'Принять', callback_data:'/accept ' + valueProject},
                                    {"text": 'Отклонить', callback_data:'/cancel ' + valueProject},
                                ],
                                [
                                    {"text": "Предложить свою ставку", web_app: {url: webAppAddStavka + '/' + valueProject}},
                                ],
                            ]
                            });
                        } else {
                            keyboard2 = JSON.stringify({
                            inline_keyboard: [
                                [
                                    {"text": 'Принять', callback_data:'/accept ' + valueProject},
                                    {"text": 'Отклонить', callback_data:'/cancel ' + valueProject},
                                ],
                            ]
                            });
                        }
        
                        //отправить в телеграмм
                        let sendTextToTelegram
                        let sendPhotoToTelegram
                        let url_send_photo                   
                        
                        if (text !== '') {
                            const url_send_msg = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${user}&parse_mode=html&text=${text.replace(/\n/g, '%0A')}`
                            //const url_send_msg = `https://api.telegram.org/bot${token}/getChat?chat_id=${user}`
                            
                            console.log("Отправка текста...")
                            
                            sendTextToTelegram = await $host.get(url_send_msg)
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
  

                            const { status } = sendTextToTelegram;              

                            if (status === 200) {
                                console.log("статус 200 текст")
                                countSuccess = countSuccess + 1 
                                
                                //обновить статус доставки
                                arrUsers[index-1].status = 200  
                                arrUsers[index-1].mess = sendTextToTelegram.data?.result?.message_id 

                                //обновить бд рассылку
                                const newDistrib = await Distributionw.update(
                                    {   
                                        delivered: true,
                                        deleted: false,  
                                        report: JSON.stringify(arrUsers),  
                                        success: countSuccess
                                    },
                                    { where: {id: id} }
                                )
                            }                    
                        } else {
                            if (type === '1') {
                                url_send_photo = `https://api.telegram.org/bot${token}/sendPhoto?chat_id=${user}&photo=${image}&reply_markup=${editButton ? keyboard : keyboard2}`
                                console.log("url_send_photo2: ", url_send_photo)
                            } 
                            else if (type === '2') { 
                                url_send_photo = `https://api.telegram.org/bot${token}/sendDocument?chat_id=${user}&document=${image}&reply_markup=${editButton ? keyboard : keyboard2}`
                                console.log("url_send_document2: ", url_send_photo)
                            }
                            else if (type === '3') { 
                                url_send_photo = `https://api.telegram.org/bot${token}/sendAudio?chat_id=${user}&audio=${image}&reply_markup=${editButton ? keyboard : keyboard2}`
                                console.log("url_send_audio2: ", url_send_photo)
                            }
                            else if (type === '4') { 
                                url_send_photo = `https://api.telegram.org/bot${token}/sendVideo?chat_id=${user}&video=${image}&reply_markup=${editButton ? keyboard : keyboard2}`
                                console.log("url_send_video2: ", url_send_photo)
                            }
                            else {
                                url_send_photo = `https://api.telegram.org/bot${token}/sendPhoto?chat_id=${user}&photo=${image}&reply_markup=${editButton ? keyboard : keyboard2}`
                                console.log("url_send_else2: ", url_send_photo)
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

                            if (status === 200 && text === '') {
                                console.log("статус 200 фото")
                                countSuccess = countSuccess + 1  
                                        
                                //обновить статус доставки
                                arrUsers[index-1].status = 200
                                arrUsers[index-1].mess = sendPhotoToTelegram.data?.result?.message_id   

                                //обновить бд рассылку
                                const newDistrib = await Distributionw.update(
                                    { delivered: true,
                                        report: JSON.stringify(arrUsers),  
                                        success: countSuccess},
                                    { where: {id: id} }
                                )
                            }
                        }
                    
                        //отправить в админку
                        let message = {};
                        if (text !== '') {
                            console.log("no file")
                                message = {
                                    senderId: chatAdminId, 
                                    receiverId: user,
                                    conversationId: conversation_id,
                                    type: "text",
                                    text: text,
                                    isBot: true,
                                    messageId: sendTextToTelegram.data?.result?.message_id,
                                    buttons: '',
                                }
                        } else if (image) {
                            console.log("file yes")
                                message = {
                                    senderId: chatAdminId, 
                                    receiverId: user,
                                    conversationId: conversation_id,
                                    type: "image",
                                    text: image,
                                    isBot: true,
                                    messageId: sendPhotoToTelegram.data?.result?.message_id,
                                    buttons: textButton,
                                }
                        }
                        //console.log("message send: ", message);

                        //сохранение сообщения в базе данных wmessage
                        await Message.create(message)

                        //сохранить в контексте
                        if(!image) {                         
                            //отправить сообщение в админку
                            socket.emit("sendAdminSpec", { 
                                senderId: chatAdminId,
                                receiverId: user,
                                text: text,
                                type: 'text',
                                buttons: textButton,
                                convId: conversation_id,
                                messageId: sendTextToTelegram.data.result.message_id,
                                isBot: true,
                            })
                        } else {
                            //отправить сообщение в админку
                            socket.emit("sendAdminSpec", { 
                                senderId: chatAdminId,
                                receiverId: user,
                                text: image,
                                type: 'image',
                                buttons: textButton,
                                convId: conversation_id,
                                messageId: sendPhotoToTelegram.data.result.message_id,
                                isBot: true,
                            })
                        }
                    }  

                }, 1000 * ++index) 

            })

            return res.status(200).json("Distribution has been send successfully");
        } catch (error) {
            return res.status(500).json(error.message);
        }
    }

    //del messages
    // async delMessagesDistribW(req, res) {
    //     const {id} = req.params  
    //     let arrUsers = []
    //     let countSuccess = 0

    //     try {
    //         let exist=await Distributionw.findOne( {where: {id: id}} )
            
    //         if(!exist){
    //             res.status(500).json({msg: "distrib not exist"});
    //             return;
    //         }

    //         const selected = exist.dataValues.users.split(',')
    //         const valueProject = exist.dataValues.projectId
    //         const textButton = exist.dataValues.button
    //         const text = exist.dataValues.text
    //         const image = exist.dataValues.image
    //         const editButton = exist.dataValues.editButton
    //         const target = exist.dataValues.target

    //         //console.log("selected: ", selected)

    //         selected.map(async (user, index) => {      
    //             setTimeout(async()=> { 
                
    //                 console.log(index + " Пользователю ID: " + user + " сообщение удалено!")
    //                 let  conversation_id  


    //                 //найти беседу
    //                 const conversation = await Conversation.findOne({
    //                     where: {
    //                         members: {
    //                             [Op.contains]: [user]
    //                         }
    //                     },
    //                 }) 

    //                 //если нет беседы, то создать 
    //                 if (!conversation) {
    //                     const conv = await Conversation.create(
    //                     {
    //                         members: [user, chatAdminId],
    //                     })
    //                     console.log("Беседа успешно создана: ", conv) 
    //                     console.log("conversationId: ", conv.id)
                        
    //                     conversation_id = conv.id
    //                 } else {
    //                     //console.log('Беседа уже создана в БД')  
    //                     //console.log("conversationId: ", conversation.id)  
                        
    //                     conversation_id = conversation.id
    //                 }


 

    //             }, 100 * ++index) 

    //         })

    //         return res.status(200).json("Distribution has been send successfully");
    //     } catch (error) {
    //         return res.status(500).json(error.message);
    //     }
    // }
}

module.exports = new DistributionController()