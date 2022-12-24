module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
        client.user.setActivity('Halozy', { type: 'LISTENING' });
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
