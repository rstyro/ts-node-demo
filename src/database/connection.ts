import mysql, { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { config } from '@/config';
import { log } from '@/utils/logger';

/**
 * MySQL 连接池实例
 * 配置项从全局配置中读取，支持命名占位符
 */
const pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    connectionLimit: config.database.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    namedPlaceholders: true,
});

/**
 * 从连接池获取数据库连接
 * @returns Promise<PoolConnection> - 数据库连接实例
 * @throws 连接失败时抛出错误并记录日志
 */
export async function getConnection(): Promise<PoolConnection> {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        log.error('Database connection failed:', error);
        throw error;
    }
}

/**
 * 执行查询语句（SELECT）
 * @template T - 返回数据类型
 * @param sql - SQL 查询语句
 * @param params - 可选参数对象，用于命名占位符
 * @returns Promise<T[]> - 查询结果数组
 */
export async function query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    const connection = await getConnection();
    try {
        const [rows] = await connection.query(sql, params);
        return rows as T[];
    } finally {
        connection.release();
    }
}

/**
 * 执行写操作语句（INSERT/UPDATE/DELETE）
 * @param sql - SQL 执行语句
 * @param params - 可选参数对象，用于命名占位符
 * @returns Promise<ResultSetHeader> - 执行结果头信息
 */
export async function execute(sql: string, params?: Record<string, any>): Promise<ResultSetHeader> {
    const connection = await getConnection();
    try {
        const [result] = await connection.execute(sql, params);
        return result as ResultSetHeader;
    } finally {
        connection.release();
    }
}

/**
 * 执行事务操作
 * @template T - 返回数据类型
 * @param callback - 事务回调函数，接收连接参数
 * @returns Promise<T> - 事务执行结果
 * @throws 事务失败时自动回滚并抛出错误
 */
export async function transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        log.error('Transaction failed, rolled back:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 检查数据库连接是否可用
 * @returns Promise<boolean> - 连接是否正常
 */
export async function ping(): Promise<boolean> {
    const connection = await getConnection();
    try {
        await connection.ping();
        return true;
    } catch {
        return false;
    } finally {
        connection.release();
    }
}

export default pool;