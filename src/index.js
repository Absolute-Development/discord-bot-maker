var Discord = require("discord.js");

var BotMaker = function(conf) {
	this.token = conf.token
	this.game = conf.game
	this.client = new Discord.Client();

	this.registeredTriggers = [];
	this.registeredServices = {};

	this.services = require('./services');
	this.tasks    = require('./tasks');
	this.triggers = require('./triggers');
	this.packages = require('./packages');
};


BotMaker.prototype.connect = function(cb) {
	var logger = this.getService('logger');
	this.client.login(this.token);
	logger.log(this.client.user.username + "is online")
	this.client.setPresence({
        game: {
            name: this.game,
            type: 0
        }
    });
	this.client.on('ready', cb);

	var that = this;
	this.client.on('ready', function() {
		that.client.setMaxListeners(100);
		that.registeredTriggers.forEach(function(trigger) {
			trigger.setup(that);
			trigger.run(that);
		});
	});
};

BotMaker.prototype.hasService = function(name) {
	return !!this.registeredServices[name];
};

BotMaker.prototype.addService = function(name, component) {
	if (this.hasService(name))
		throw new Error('Error 002: A component already exists under this name.');

	this.registeredServices[name] = component;
};

BotMaker.prototype.getService = function(name) {
	return this.registeredServices[name];
};

BotMaker.prototype.use = function(h) {
	return h(this);
};

BotMaker.prototype.on = function(trigger) {
	var that = this;

	if (!(trigger instanceof this.triggers.now))
		trigger = new (Function.prototype.bind.apply(trigger, arguments));

	this.registeredTriggers.push(trigger);

	return trigger;
};

BotMaker.prototype.sendAndLog = function(method, target, message, callback) {
	var logger = this.getService('logger');
	var that = this;

	var args = [target, message];

	if (method ==  'reply')
		args.push({});

	args.push(function(err, message) {
		if (err && logger)
			logger.log('Error 001 OCCUR while sending message: ' + err);
		else if (logger) {
			that.client.resolveDestination(target).then(function(destination) {
				logger.log('Sent message to #' + destination + ': ' + message.content);
			});
		}

		if (callback)
			callback(err, message);
	});

	this.client[method].apply(this.client, args);
}

BotMaker.prototype.sendMessage = function(target, message, callback) {
	this.sendAndLog('sendMessage', target, message, callback);
};

BotMaker.prototype.updateMessage = function(target, message, callback) {
	this.sendAndLog('updateMessage', target, message, callback);
};

BotMaker.prototype.reply = function(target, message, callback) {
	this.sendAndLog('reply', target, message, callback);
};

module.exports = BotMaker;
