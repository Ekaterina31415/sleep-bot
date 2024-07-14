require('dotenv').config();
const { Bot, GrammyError, HttpError } = require('grammy');
const sequelize = require('./db.js');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const lessons = require('./lessons.js');
const { createUser, updateTimeZoneByChatId, findUserByChatId, getAllUsers, updateLessonNumberByChatId, deleteUserByChatId } = require('./service.js');

const bot = new Bot(process.env.BOT_API_KEY);
const adminId = 443288170;
const session = {
    isAwaitingTimeZone: false,
    offset: null,
    isAwaitingUpdatedTimeZone: false,
};

bot.api.setMyCommands([
    {
        command: 'start', 
        description: 'Запустить бота'
    },
    {
        command: 'update_timezone',
        description: 'Переустановить часовой пояс',
    },
    // {
    //     command: 'get_lesson',
    //     description: 'Получить урок по его номеру'
    // }
]);

bot.command('start', async (ctx) => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
    } catch (e) {
        notifyAdmin('Connection to data base failed! ', e);
    }
    
    try {
        await ctx.reply('Здравствуйте! Пожалуйста, скажите, на сколько ваше время отличается от Московского (например, +1).');
        session.isAwaitingTimeZone = true;
    } catch (e) {
        notifyAdmin('Error while greeting user: ', e);
    }
});

bot.command('update_timezone', async (ctx) => {
    await ctx.reply('Пожалуйста, скажите, на сколько ваше время отличается от Московского (например, +1).');
    session.isAwaitingUpdatedTimeZone = true;
});

// bot.command('get_lesson', async (ctx) => {
//     await ctx.reply('Отправьте мне номер урока от 1 до 30 :)');
//     session.isAwaitingLessonNumber = true;
// });

bot.on('message', async (ctx) => {
    const offset = ctx.update.message.text;
    const offsetRegex = /^0$|^[+-](?:0|[1-9]|1[0-2])$/;
    const chatId = ctx.update.message.chat.id;

    if (session.isAwaitingTimeZone) {
        const userName = ctx.update.message.from.username;
        const firstName = ctx.update.message.from.first_name;
        const lastName = ctx.update.message.from.last_name;

        if (offsetRegex.test(offset)) {
            session.isAwaitingTimeZone = false;
            session.offset = offset;
            await ctx.reply(`Спасибо, ваш часовой пояс сохранён как МСК ${offset}. Теперь каждый день в 20:00 по вашему местному времени я буду отправлять Вам урок из курса Максима по сну.`);
        } else {
            await ctx.reply("Пожалуйста, укажите отклонение от Московского времени в правильном формате (от -12 до +12).");
            return;
        }
        const scheduleTime = `${addHoursToTime(parseInt(session.offset))}:00`; //на 3 часа раньше от 20:00, потому что в shedule неправильные часовые пояса

        try {
            await createUser(chatId, userName, firstName, lastName, scheduleTime);
            notifyAdmin(`${userName} just started sleep course!`);
        } catch (e) {
            notifyAdmin(`Error while creating user ${userName}: `, e);
        }
    };

    if (session.isAwaitingUpdatedTimeZone) {
        if (offsetRegex.test(offset)) {
            session.isAwaitingUpdatedTimeZone = false;
            session.offset = offset;
            await ctx.reply(`Спасибо, ваш часовой пояс сохранён как МСК ${offset}.`);
        } else {
            await ctx.reply("Пожалуйста, укажите отклонение от Московского времени в правильном формате (от -12 до +12).");
            return;
        }
        const scheduleTime = `${addHoursToTime(parseInt(session.offset))}:00`;

        try {
            await updateTimeZoneByChatId(chatId, scheduleTime);
        } catch (e) {
            notifyAdmin(`Error while updating timezone. ChatId: ${chatId}, scheduleTime: ${scheduleTime}: `, e);
        }
    }
});


bot.catch((err) => {
    const { ctx, e } = err;
    notifyAdmin(`Error while handling update ${ctx.update.update_id}: `, e);

    if (e instanceof GrammyError) {
        notifyAdmin('Error in request: ', e.description);
    } else if (e instanceof HttpError) {
        notifyAdmin('Could not contact Telegram: ', e);
    } else {
        notifyAdmin('Unknown error: ', e);
    }
})

bot.start();

schedule.scheduleJob('* * * * *', async () => {
    try {
        const users = await getAllUsers();
        const moscowTime = moment().tz('Europe/Moscow').format('HH:mm');
  
        users?.forEach((user) => {
            if (user.dataValues.lessonNumber === 777) return;
            const chatId = user.dataValues.chatId;
            const scheduleTime = user.dataValues.scheduleTime;
            const lessonNumber = user.dataValues.lessonNumber;
        
            if (moscowTime === scheduleTime) {
                sendLesson(lessonNumber, chatId);
                notifyAdmin(`${user.dataValues.userName} just received the lesson #${lessonNumber}!`);
            }
        });
    } catch (e) {
        notifyAdmin('Error while schedule lessons: ', e);
    }
});

//в sendLesson можно не отправлять номер урока
//разделить логику апдейта номера и отправки урока
//проверку на номер урока и удаление из базы делать перед отправкой. Ну или после, но тоже как-то отдельно
//или в сенд лессон передавать сразу дата валуес чтобы не запрашивать юзера
const sendLesson = async (lessonNumber, chatId) => {
  const lesson = lessons[lessonNumber - 1];
  try {
    await bot.api.sendMessage(chatId, lesson);
  } catch (e) {
    notifyAdmin('Error while sending lesson: ', e);
  }
  
  try {
    const user = await findUserByChatId(chatId);
    if (user.dataValues.lessonNumber === 30) {
        await deleteUserByChatId(chatId);
        notifyAdmin(`${user.dataValues.userName} just finished sleep course!`);
    } else {
        await updateLessonNumberByChatId(chatId, lessonNumber + 1);
    } 
  } catch (e) {
    notifyAdmin('Error while updating lesson number: ', e);
  }
};

const notifyAdmin = (error) => {
    try {
        bot.api.sendMessage(adminId, error);
    } catch (e) {
        console.error('Error while sending message to admin :(');
    }
};

const addHoursToTime = (hoursToAdd) => {
    let hours = 20 - hoursToAdd;

    if (hours >= 24) {
        hours -= 24;
    } else if (hours < 0) {
        hours += 24;
    }

    return hours;
};

module.exports = { bot };

//232629613 maks
//443288170 me

