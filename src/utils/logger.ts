import winston, { Logger, format, transports } from 'winston';
import { config } from '@/config';

const { combine, timestamp, printf, colorize, json } = format;

/**
 * 自定义日志格式
 */
const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaString = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
    return `${ts} [${level}]: ${message}${metaString}`;
});

/**
 * 创建 Winston Logger 实例
 */
const log: Logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    /**
     * 默认附加字段
     * 用于标识日志来源
     */
    defaultMeta: { service: config.name },
    /**
     * 全局日志格式
     * - 所有日志都会带时间戳
     */
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    /**
     * 日志输出目标（transports）
     */
    transports: [
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), json())
        }),
        new transports.File({
            filename: 'logs/combined.log',
            format: combine(timestamp(), json())
        })
    ]
});

/**
 * 开发环境额外配置
 *
 * - 输出到控制台
 * - 彩色显示
 * - 人类可读格式
 */
if (config.nodeEnv !== 'production') {
    log.add(
        new transports.Console({
            format: combine(
                timestamp(),
                colorize(),   // 彩色级别（info / error / warn）
                logFormat     // 自定义文本格式
            )
        })
    );
}

export { log };
