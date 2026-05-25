import app from '@/app';
import { config } from '@/config';
import { log } from '@/utils/logger';

// 服务启动
const server = app.listen(config.port, () => {
    log.info(`${config.name} 服务运行在 http://localhost:${config.port}`);
    log.debug(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    log.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    log.info(`${config.name} 服务启动成功`, {
        url: `http://localhost:${config.port}`,
        mode: config.nodeEnv,
        endpoints: {
            health: `GET http://localhost:${config.port}/health`,
            user: `GET http://localhost:${config.port}/api/user`
        }
    });
});

// 优雅关闭
process.on('SIGTERM', () => {
    log.info('SIGTERM received, closing server...');
    server.close(() => {
        log.info('Server closed');
        process.exit(0);
    });
});