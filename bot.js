'use strict'
let config = require('./config')
const util = require('util')

const { ScreepsAPI } = require('screeps-api')
const auth = config.screeps
const colors = require('colors')

let api = new ScreepsAPI()

var Botkit = require('botkit')
var controller = Botkit.slackbot({
  json_file_path: './data.json'
})
var bot = controller.spawn(config.slack)
var slackbot
var fullChannelList = []
controller.middleware.send.use(function (bot, message, next) {
  if (message.channel[0] == '#') {
    message.channel = (fullChannelList.find(c => c.name == message.channel.slice(1)) || {}).id || message.channel
  }
  // console.log(message.channel, fullChannelList)
  next()
})
bot.startRTM(function (err, bot, payload) {
  if (err) {
    throw new Error('Could not connect to Slack')
  }
  bot.api.channels.list({}, function (err, response) {
    if (response.hasOwnProperty('channels') && response.ok) {
      var total = response.channels.length
      for (var i = 0; i < total; i++) {
        var channel = response.channels[i]
        fullChannelList.push({name: channel.name, id: channel.id})
      }
      startAPI(bot)
    // process.exit(1)
    }else {
      // process.exit(1)
    }
  })
  let oldconsole = {
    log: console.log,
    warn: console.warn,
    info: console.info,
    error: console.error
  }
  let botsay = (...args) => {
    oldconsole[args[0]](...args.slice(1))
    bot.say({
      text: args.map(d => typeof d == 'object' ? util.inspect(d) : d).join(' '),
      channel: '#debug'
    })
  }
// console.log = function () {  botsay('log', ...arguments) }
// console.warn = function () { botsay('warn', ...arguments) }
// console.info = function () { botsay('info', ...arguments) }
// console.error = function () {  botsay('error', ...arguments) }
})

controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.startConversation(message, function (err, convo) {
    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          convo.say('Bye!')
          convo.next()
          setTimeout(function () {
            process.exit()
          }, 3000)
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('*Phew!*')
          convo.next()
        }
      }
    ])
  })
})

controller.hears(['command', 'cmd', 'do'], 'direct_message,direct_mention,mention', (bot, msg) => {
  let [, cmd, ...args] = msg.text.split(' ')
  let fargs = args.map(a => `'${a}'`).join(',') || `''`
  console.log(cmd, ...args, fargs, msg)
  api.console(`slack.command('${msg.channel}','${cmd}',${fargs})`)
})

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
  'direct_message,direct_mention,mention', function (bot, message) {
    let os = require('os')
    var hostname = os.hostname()
    var uptime = formatUptime(process.uptime())

    bot.reply(message,
      ':robot_face: I am a bot named <@' + bot.identity.name +
      '>. I have been running for ' + uptime + ' on ' + hostname + '.')
  })

function formatUptime (uptime) {
  var unit = 'second'
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'minute'
  }
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'hour'
  }
  if (uptime != 1) {
    unit = unit + 's'
  }

  uptime = uptime + ' ' + unit
  return uptime
}

function debug (...args) {
  slackbot.say({
    text: args.map(d => util.inspect(d)).join(' '),
    channel: 'bot-debug'
  })
}

function startAPI (bot) {
  api.bot = bot
  Promise.resolve(auth)
    .then(connect)
    .then(start)
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

function connect (auth) {
  return new Promise((resolve, reject) => {
    console.log('Authenticating...')
    api.auth(auth.email, auth.password, (err, result) => {
      if (result) {
        console.log('Authentication succeeded')
        resolve()
      }else {
        console.log('Authentication failed')
        reject()
      }
    })
  })
}

function start () {
  return new Promise((resolve, reject) => {
    run()
    api.socket(() => {
      console.log('start')
    })
  })
}

function run () {
  api.on('message', (msg) => {
    console.log(msg)
    if (msg.slice(0, 7) == 'auth ok') {
      api.subscribe('/console')
      api.subscribe('/memory/slack/config')
      console.log('Console connected'.green)
    }
  // console.log(msg)
  })

  api.on('console', (msg) => {
    // return
    let [user, data] = msg
    // if (data.messages) data.messages.log.forEach(l => console.log(l))
    // if (data.messages) data.messages.results.forEach(l => console.log('>', l.gray))
    // if (data.error) console.log(data.error.red)
    if (data.messages) data.messages.log.forEach(l => {
        if (!l) return
        let [, target] = l.match(/^slack:([#A-Z0-9]+).*$/im) || []
        let data = l.slice(l.indexOf(' ') + 1)
        if (target && data) {
          console.log(target, data)
          api.bot.say({
            channel: target,
            text: data
          })
        }
      })
  })

  api.on('memory', (msg) => {
    let [user, data] = msg
    return
    api.bot.say({
      channel: '#debug',
      text: '```' + JSON.stringify(msg, null, 3) + '```'
    })
  })
}
