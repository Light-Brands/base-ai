// PM2 Ecosystem Configuration
// Start with: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'ai-architect-backend',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
