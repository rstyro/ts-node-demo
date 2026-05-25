import { query, execute, transaction } from '@/database/connection';

/**
 * 高级查询条件接口
 * 支持多种比较操作符
 */
export interface WhereCondition {
    field: string;
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'IN' | 'NOT IN';
    value: any;
}

/**
 * 排序条件接口
 */
export interface OrderBy {
    field: string;
    direction: 'ASC' | 'DESC';
}

/**
 * 数据库操作封装类
 * 提供常见的 CRUD 操作方法
 */
export class Database {
    private tableName: string;

    /**
     * 构造函数
     * @param tableName - 表名
     */
    constructor(tableName: string) {
        this.tableName = tableName;
    }

    /**
     * 查询单条记录
     * @template T - 返回数据类型
     * @param conditions - 查询条件对象
     * @returns Promise<T | null> - 查询结果，无结果时返回 null
     */
    async findOne<T = any>(conditions: Record<string, any>): Promise<T | null> {
        const keys = Object.keys(conditions);
        if (keys.length === 0) {
            const [row] = await query<T>(`SELECT * FROM ${this.tableName} LIMIT 1`);
            return row || null;
        }

        const whereClause = keys.map(key => `${key} = :${key}`).join(' AND ');
        const [row] = await query<T>(`SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`, conditions);
        return row || null;
    }

    /**
     * 查询多条记录
     * @template T - 返回数据类型
     * @param options - 查询选项
     * @param options.conditions - 简单等值条件
     * @param options.where - 高级条件数组
     * @param options.orderBy - 排序条件
     * @param options.limit - 限制条数
     * @param options.offset - 偏移量
     * @returns Promise<T[]> - 查询结果数组
     */
    async findAll<T = any>(
        options: {
            conditions?: Record<string, any>;
            where?: WhereCondition[];
            orderBy?: OrderBy[];
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<T[]> {
        let sql = `SELECT * FROM ${this.tableName}`;
        const params: Record<string, any> = {};

        const allConditions: string[] = [];

        if (options.conditions) {
            Object.entries(options.conditions).forEach(([key, value]) => {
                params[key] = value;
                allConditions.push(`${key} = :${key}`);
            });
        }

        if (options.where) {
            options.where.forEach((condition, index) => {
                const paramKey = `cond_${index}`;
                if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
                    params[paramKey] = condition.value;
                    allConditions.push(`${condition.field} ${condition.operator} (:${paramKey})`);
                } else {
                    params[paramKey] = condition.value;
                    allConditions.push(`${condition.field} ${condition.operator} :${paramKey}`);
                }
            });
        }

        if (allConditions.length > 0) {
            sql += ` WHERE ${allConditions.join(' AND ')}`;
        }

        if (options.orderBy) {
            const orderByClause = options.orderBy.map(o => `${o.field} ${o.direction}`).join(', ');
            sql += ` ORDER BY ${orderByClause}`;
        }

        if (options.limit !== undefined) {
            sql += ` LIMIT ${options.limit}`;
            if (options.offset !== undefined) {
                sql += ` OFFSET ${options.offset}`;
            }
        }

        return query<T>(sql, params);
    }

    /**
     * 根据 ID 查询记录
     * @template T - 返回数据类型
     * @param id - 记录 ID
     * @returns Promise<T | null> - 查询结果，无结果时返回 null
     */
    async findById<T = any>(id: number | string): Promise<T | null> {
        const [row] = await query<T>(`SELECT * FROM ${this.tableName} WHERE id = :id`, { id });
        return row || null;
    }

    /**
     * 插入单条记录
     * @template T - 返回数据类型
     * @param data - 插入数据对象
     * @returns Promise<T> - 插入后的完整记录（包含自增 ID）
     */
    async insert<T = any>(data: Record<string, any>): Promise<T> {
        const keys = Object.keys(data);
        const placeholders = keys.map(key => `:${key}`).join(', ');
        const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        const result = await execute(sql, data);
        return { ...data, id: result.insertId } as T;
    }

    /**
     * 批量插入记录
     * @param data - 插入数据数组
     * @returns Promise<number> - 受影响的行数
     */
    async insertMany(data: Record<string, any>[]): Promise<number> {
        if (data.length === 0) return 0;

        const keys = Object.keys(data[0]);
        const values = data.map((_, index) => {
            return '(' + keys.map(key => `:${key}_${index}`).join(', ') + ')';
        }).join(', ');

        const params: Record<string, any> = {};
        data.forEach((row, index) => {
            Object.entries(row).forEach(([key, value]) => {
                params[`${key}_${index}`] = value;
            });
        });

        const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${values}`;
        const result = await execute(sql, params);
        return result.affectedRows;
    }

    /**
     * 根据 ID 更新记录
     * @param id - 记录 ID
     * @param data - 更新数据对象
     * @returns Promise<number> - 受影响的行数
     */
    async update(id: number | string, data: Record<string, any>): Promise<number> {
        const keys = Object.keys(data).filter(key => key !== 'id');
        if (keys.length === 0) return 0;

        const setClause = keys.map(key => `${key} = :${key}`).join(', ');
        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = :id`;
        const result = await execute(sql, { ...data, id });
        return result.affectedRows;
    }

    /**
     * 根据条件更新记录
     * @param data - 更新数据对象
     * @param conditions - 更新条件
     * @returns Promise<number> - 受影响的行数
     */
    async updateByConditions(
        data: Record<string, any>,
        conditions: Record<string, any>
    ): Promise<number> {
        const dataKeys = Object.keys(data);
        const conditionKeys = Object.keys(conditions);

        if (dataKeys.length === 0 || conditionKeys.length === 0) return 0;

        const setClause = dataKeys.map(key => `${key} = :${key}`).join(', ');
        const whereClause = conditionKeys.map(key => `${key} = :cond_${key}`).join(' AND ');

        const params: Record<string, any> = { ...data };
        Object.entries(conditions).forEach(([key, value]) => {
            params[`cond_${key}`] = value;
        });

        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
        const result = await execute(sql, params);
        return result.affectedRows;
    }

    /**
     * 根据 ID 删除记录
     * @param id - 记录 ID
     * @returns Promise<number> - 受影响的行数
     */
    async delete(id: number | string): Promise<number> {
        const result = await execute(`DELETE FROM ${this.tableName} WHERE id = :id`, { id });
        return result.affectedRows;
    }

    /**
     * 根据条件删除记录
     * @param conditions - 删除条件
     * @returns Promise<number> - 受影响的行数
     */
    async deleteByConditions(conditions: Record<string, any>): Promise<number> {
        const keys = Object.keys(conditions);
        if (keys.length === 0) return 0;

        const whereClause = keys.map(key => `${key} = :${key}`).join(' AND ');
        const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
        const result = await execute(sql, conditions);
        return result.affectedRows;
    }

    /**
     * 统计记录数量
     * @param conditions - 统计条件（可选）
     * @returns Promise<number> - 记录数量
     */
    async count(conditions?: Record<string, any>): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params: Record<string, any> = {};

        if (conditions) {
            const keys = Object.keys(conditions);
            const whereClause = keys.map(key => `${key} = :${key}`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            Object.assign(params, conditions);
        }

        const [row] = await query<{ count: number }>(sql, params);
        return row?.count || 0;
    }

    /**
     * 判断记录是否存在
     * @param conditions - 查询条件
     * @returns Promise<boolean> - 是否存在
     */
    async exists(conditions: Record<string, any>): Promise<boolean> {
        const count = await this.count(conditions);
        return count > 0;
    }

    /**
     * 执行自定义查询
     * @template T - 返回数据类型
     * @param sql - SQL 查询语句
     * @param params - 可选参数对象
     * @returns Promise<T[]> - 查询结果数组
     */
    async query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
        return query<T>(sql, params);
    }

    /**
     * 执行自定义写操作
     * @param sql - SQL 执行语句
     * @param params - 可选参数对象
     * @returns Promise<{ affectedRows: number; insertId: number }> - 执行结果
     */
    async execute(sql: string, params?: Record<string, any>): Promise<{ affectedRows: number; insertId: number }> {
        const result = await execute(sql, params);
        return {
            affectedRows: result.affectedRows,
            insertId: result.insertId,
        };
    }

    /**
     * 静态事务方法
     * @template T - 返回数据类型
     * @param callback - 事务回调函数
     * @returns Promise<T> - 事务执行结果
     */
    static async transaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
        return transaction(callback);
    }
}

export default Database;