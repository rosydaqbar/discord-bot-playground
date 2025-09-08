const logger = require('../utils/logger');
const musicPlayer = require('../services/musicPlayer');

// Initialize music event logging for Medley-based player
function initializeMusicEventLogging() {
    // Since we're using Medley directly in the musicPlayer service,
    // we don't need to set up global event listeners here.
    // The musicPlayer service handles its own logging internally.
    
    logger.info('Music event logging initialized (Medley-based)');
}

module.exports = { initializeMusicEventLogging };