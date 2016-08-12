class Slack {
  get config () {
    if (!this._config)
      this.load()
    return this._config
  }
  constructor () {
    this.commands = []
    global.slack = this
    this.setup()
  }
  setup () {
    if (!Memory.slack)
      Memory.slack = {
        config: '{}'
    }
  }
  loop () {}
  load () {
    return this._config = JSON.parse(Memory.slack.config)
  }
  save () {
    Memory.slack.config = JSON.stringify(this._config || {})
  }
  command (channel, cmd, ...args) {
    let {func} = this.commands.find(c => c.cmd == cmd) || []
    // console.log('Command:',channel,cmd,...args,func,this.commands.length)
    // this.send(channel,'Command:',channel,cmd,...args,func,this.commands.length)
    let ret = func(...args)
    this.send(channel, ret)
  }
  addCommand (cmd, func) {
    this.commands.push({cmd,func})
  }
  remCommand (cmd) {
    let ind = this.commands.findIndex(i => i.cmd == cmd)
    if (ind > -1) this.commands.splice(ind, 1)
  }
  send (target, ...args) {
    console.log(`slack:${target}`, ...args)
  }
}

module.exports = Slack
