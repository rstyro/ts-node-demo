import app from '@/app';
import { config } from '@/config';

// 服务启动
const server = app.listen(config.port, () => {
    console.log(`${config.name} 服务运行在 http://localhost:${config.port}`);
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`   - 模式: ${config.nodeEnv} mode`);
    console.log(`   - 健康检查: GET  http://localhost:${config.port}/health`);
    console.log(`   - 用户接口: GET  http://localhost:${config.port}/api/user`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});