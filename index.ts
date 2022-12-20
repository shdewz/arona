export { };
require('source-map-support').install();
require('dotenv').config();
require('console-stamp')(console, { format: ':date(HH:MM:ss)' });

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds], allowedMentions: { parse: ['users', 'roles'], repliedUser: true } });
client.commands = new Collection();

require('./db.js').init();
require('./handlers/event_handler.js')(client);
require('./handlers/command_handler.js')(client);

client.login(process.env.TOKEN);
