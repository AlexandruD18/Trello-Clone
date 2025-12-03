// PM2 Ecosystem Configuration
module.exports = {
  apps: [
    {
      name: 'trello-clone',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ],

  deploy: {
    production: {
      user: 'teamtrello',
      host: 'teamtrello.lab.home.lucasacchi.net',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/trello-clone.git',
      path: '/home/teamtrello/trello-clone',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd client && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
