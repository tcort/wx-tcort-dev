'use strict';

const path = require('path');

module.exports = {
    apps: [{
        name: 'wx-tcort-dev',
        namespace: 'lorawan',
        script: path.join(__dirname, 'index.js'),
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        exec_mode: 'fork',
        restart_delay: 5000,
        error_file: '/dev/null',
        env: {
            HTTP_PORT: 3000,
            NODE_ENV: 'development',
        },
        env_production : {
            HTTP_PORT: 4000,
            NODE_ENV: 'production',
        },
    }],
};

