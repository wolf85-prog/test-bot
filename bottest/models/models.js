const sequelize = require('../connections/db')
const {DataTypes} = require('sequelize')

const UserBot = sequelize.define('userbot', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    firstname: {type: DataTypes.STRING},
    lastname: {type: DataTypes.STRING},
    chatId: {type: DataTypes.STRING, unique: true},
    username: {type: DataTypes.STRING},
    avatar: {type: DataTypes.STRING},
})

const Message = sequelize.define('message', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    conversationId: {type: DataTypes.STRING},
    senderId: {type: DataTypes.STRING},
    receiverId: {type: DataTypes.STRING},    
    text: {type: DataTypes.STRING}, //текст сообщения;
    type: {type: DataTypes.STRING},      //тип сообщения;
    is_bot: {type: DataTypes.BOOLEAN},
    messageId: {type: DataTypes.STRING},
    buttons: {type: DataTypes.STRING},   //названия кнопок;
})

const Conversation = sequelize.define('conversation', {
    members: {type: DataTypes.ARRAY(DataTypes.STRING)},
})

const Project = sequelize.define('project', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING},  //название проекта
    datestart: {type: DataTypes.STRING},  //дата начала проекта
    spec: {type: DataTypes.STRING},
    equipment: {type: DataTypes.STRING},
    teh: {type: DataTypes.STRING},
    geo: {type: DataTypes.STRING},
    managerId: {type: DataTypes.STRING},
    companyId: {type: DataTypes.STRING},
    projectId: {type: DataTypes.STRING},
    chatId: {type: DataTypes.STRING},
})

const Distribution = sequelize.define('distribution', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true}, 
    name: {type: DataTypes.STRING},  //название рассылки
    text: {type: DataTypes.STRING}, //текст сообщения;
    image: {type: DataTypes.STRING}, //ссылка на картинку;
    button: {type: DataTypes.STRING}, //текст кнопки;
    receivers: {type: DataTypes.STRING}, //массив получателей;
    datestart: {type: DataTypes.STRING},  //дата начала рассылки
    delivered: {type: DataTypes.BOOLEAN}, //доставлено
})

const Distributionw = sequelize.define('distributionw', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true}, 
    text: {type: DataTypes.STRING}, //текст сообщения;
    image: {type: DataTypes.STRING}, //ссылка на картинку;
    project: {type: DataTypes.STRING}, //проект (название);
    receivers: {type: DataTypes.STRING}, //массив получателей;
    datestart: {type: DataTypes.STRING},  //дата начала рассылки
    delivered: {type: DataTypes.BOOLEAN}, //доставлено
    projectId: {type: DataTypes.STRING}, //проект (id);
    count: {type: DataTypes.INTEGER}, 
    date: {type: DataTypes.STRING},  //дата начала рассылки  
    users: {type: DataTypes.TEXT},
    button: {type: DataTypes.STRING}, //текст кнопки;
    uuid: {type: DataTypes.STRING}, //индекс рассылки;
    success: {type: DataTypes.INTEGER}, 
    report: {type: DataTypes.TEXT},
    editButton: {type: DataTypes.BOOLEAN}, //редактируемая кнопка
    stavka: {type: DataTypes.BOOLEAN}, //альтернативная ставка кнопка
    target: {type: DataTypes.STRING}, //ссылка;
    type: {type: DataTypes.INTEGER}, //тип файла
})

const Report = sequelize.define('report', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true}, 
    name: {type: DataTypes.STRING},  //название проекта
    text: {type: DataTypes.STRING}, //текст сообщения;
    receiverId: {type: DataTypes.STRING}, //чат-id получателя;
    date: {type: DataTypes.STRING},  //дата отправки отчета
    delivered: {type: DataTypes.BOOLEAN}, //доставлено
})

const Plan = sequelize.define('plan', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true}, 
    datestart: {type: DataTypes.STRING},  //дата начала рассылки
    times: {type: DataTypes.TEXT},  //json часов проектов
})

// const Task = sequelize.define('task', {
//     id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//     timer: {type:DataTypes.ARRAY(DataTypes.STRING)},  //объект таймера
//     projectId: {type: DataTypes.STRING},
// })


module.exports = {
    UserBot, 
    Message, 
    Conversation, 
    Project, 
    Distribution,
    Distributionw,
    Report,
    Plan,
    //Task,
}