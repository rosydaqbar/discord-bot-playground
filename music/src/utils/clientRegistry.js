/**
 * Client Registry - Provides access to Discord client and player
 * without circular dependency issues
 */

let discordClient = null;

const clientRegistry = {
    // Set the client (called from main index.js)
    setClient(client) {
        discordClient = client;
    },

    // Get the client
    getClient() {
        return discordClient;
    },

    // Check if client is ready
    isClientReady() {
        return discordClient && discordClient.isReady();
    },

    // Get client info safely
    getClientInfo() {
        if (!this.isClientReady()) {
            return {
                ready: false,
                guilds: 0,
                users: 0,
                uptime: 0
            };
        }

        return {
            ready: true,
            guilds: discordClient.guilds.cache.size,
            users: discordClient.users.cache.size,
            uptime: discordClient.uptime,
            tag: discordClient.user.tag
        };
    }
};

module.exports = clientRegistry;