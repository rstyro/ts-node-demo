import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config/index';
import { ResponseUtil } from '@/utils/response';
import { AppError } from '@/utils/AppError';
// 导入路由（稍后定义）
import userRoutes from '@/routes/userRoutes';

const app: Application = express();

// 全局中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json(ResponseUtil.success({ status: 'ok' }, 'Service healthy'));
});

// 业务路由（示例）
app.use('/api', userRoutes);

// 404 处理（未匹配到路由）
app.use((_req: Request, res: Response) => {
    res.status(404).json(ResponseUtil.error('Resource not found', 404));
});

// 全局异常捕获中间件（必须放在所有路由和中间件之后）
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // 记录错误（生产环境建议使用 winston 等日志库）
    console.error('Global error caught:', err);

    if (err instanceof AppError) {
        // 已知业务异常：根据状态码返回统一格式
        return res.status(err.statusCode).json(
            ResponseUtil.error(err.message, err.statusCode, { code: err.code })
        );
    }

    // 未知系统异常（如数据库连接失败、语法错误等）
    const isProduction = config.nodeEnv === 'production';
    const message = isProduction ? '内部系统错误' : err.message;
    const data = isProduction ? undefined : { stack: err.stack };
    return  res.status(500).json(ResponseUtil.error(message, 500, data));
});

export default app;