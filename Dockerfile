FROM node:6
WORKDIR /app
ADD . /app
CMD [ "node", "bot.js" ]