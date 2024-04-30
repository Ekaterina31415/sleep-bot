require('dotenv').config();
const { Bot, GrammyError, HttpError } = require('grammy');
const lessons = require('./lessons.js');

const bot = new Bot(process.env.BOT_API_KEY);

bot.api.setMyCommands([
    {
        command: 'start', 
        description: 'Запустить бота'
    }
]);

bot.command('start', async (ctx) => {
    await ctx.reply('Здравствуйте! Отправьте мне цифру от 1 до 30 (порядковый номер урока), чтобы получить урок.');
});

bot.on('message', async (ctx) => {
    const requestNumber = Number(ctx.update.message.text);
    if (requestNumber <= lessons.length && requestNumber > 0) {
        await ctx.reply(lessons[requestNumber - 1]);
    } else {
        await ctx.reply('Введите порядкой номер урока (число от 1 до 30)');
    }
});


bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}: `);
    const e = err.error;

    if (e instanceof GrammyError) {
        console.error('Error in request: ', e.description);
    } else if (e instanceof HttpError) {
        console.error('Could not contact Telegram: ', e);
    } else {
        console.error('Unknown error: ', e);
    }
})

bot.start();