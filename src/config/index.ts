import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    name: process.env.NAME || 'demo',
    nodeEnv: process.env.NODE_ENV || 'development',
    // 添加其他配置项，如数据库 URL、JWT 密钥等
};