require("dotenv").config();

module.exports = {   

    menuOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard:[
                [{text: 'Информация', callback_data:'Информация'}, {text: 'Настройки', callback_data:'Настройки'}],
                [{text: 'Открыть проекты U.L.E.Y', web_app: {url: 'https://ya.ru'}}],
            ]
        })
    },
    
    backOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard:[
                [{text: 'Открыть проекты U.L.E.Y', web_app: {url: webAppUrl}}],
                [{text: 'Назад', callback_data:'/menu'}],
            ]
        })
    }
}