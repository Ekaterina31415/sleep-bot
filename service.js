const UserModel = require('./models');

const createUser = async (chatId, userName, firstName, lastName, scheduleTime) => {
  try {
    return await UserModel.create({
      chatId, userName, firstName, lastName, scheduleTime 
   });
  } catch (error) {
    console.error('Error while creating user: ', error);
  }
  
};

const deleteUserByChatId = async (chatId) => {
  try {
    return await UserModel.destroy({
      where: { chatId }
    });
  } catch (error) {
    console.error('Error while deleting user: ', error);
  }
  
};

const getAllUsers = async () => {
  try {
    return await UserModel.findAll();
  } catch (error) {
    console.error('Error while getting all users: ', error);
  }
};

const findUserByChatId = async (chatId) => {
  try {
    return await UserModel.findOne({
      where: { chatId }
    });
  } catch (error) {
    console.error('Error while finding user', error);
  }
};

const updateTimeZoneByChatId = async (chatId, scheduleTime) => {
  try {
    return await UserModel.update({ scheduleTime }, {
      where: { chatId }
    });
  } catch (error) {
    console.error('Error while updating timeZone', error);
  }
};

const updateLessonNumberByChatId = async (chatId, lessonNumber) => {
  try {
    return await UserModel.update({ lessonNumber }, {
      where: { chatId }
    });
  } catch (error) {
    console.error('Error while updating timeZone', error);
  }
}

module.exports = { createUser, deleteUserByChatId, getAllUsers, findUserByChatId, updateTimeZoneByChatId, updateLessonNumberByChatId };