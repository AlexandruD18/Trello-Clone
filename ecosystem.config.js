// Configurazione PM2. Host e utente di deploy arrivano dalle variabili
// d'ambiente, così non finiscono nel repository.
module.exports = {
    apps: [
        {
            name: 'trello-clone',
            cwd: './app/server',
            script: 'src/index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],

    deploy: {
        production: {
            user: process.env.DEPLOY_USER,
            host: process.env.DEPLOY_HOST,
            ref: 'origin/main',
            repo: 'https://github.com/AlexandruD18/Trello-Clone.git',
            path: process.env.DEPLOY_PATH || '/home/teamtrello/trello-clone',
            'post-deploy':
                'npm ci && npm run build && npm prune --omit=dev && pm2 reload ecosystem.config.js --env production',
        },
    },
};
