import { Database } from '@/database';

export interface User {
    id: number;
    nickname?: string;
    username: string;
    password: string;
    age: number;
    status: number;
    create_time: Date;
    updated_time: Date;
}

export interface CreateUserDto {
    username: string;
    password: string;
    nickname?: string;
}

export interface UpdateUserDto {
    username?: string;
    password?: string;
    nickname?: string;
    status?: number;
}

export class TestDbDao extends Database {
    constructor() {
        super('user');
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.findOne<User>({ username });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.findOne<User>({ email });
    }

    async create(data: CreateUserDto): Promise<User> {
        const now = new Date();
        return this.insert<User>({
            ...data,
            status: 1,
            create_time: now,
            updated_time: now,
        });
    }

    async update(id: number, data: UpdateUserDto): Promise<number> {
        const updateData: Record<string, any> = { ...data };
        updateData.updated_time = new Date();
        return super.update(id, updateData);
    }

    async existsByUsername(username: string, excludeId?: number): Promise<boolean> {
        if (excludeId !== undefined) {
            const users = await this.findAll<User>({
                where: [
                    { field: 'username', operator: '=', value: username },
                    { field: 'id', operator: '!=', value: excludeId },
                ],
            });
            return users.length > 0;
        }
        return this.exists({ username });
    }

    async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
        if (excludeId !== undefined) {
            const users = await this.findAll<User>({
                where: [
                    { field: 'email', operator: '=', value: email },
                    { field: 'id', operator: '!=', value: excludeId },
                ],
            });
            return users.length > 0;
        }
        return this.exists({ email });
    }

    async batchCreate(users: CreateUserDto[]): Promise<number> {
        const now = new Date();
        const data = users.map(user => ({
            ...user,
            status: 1,
            createdAt: now,
            updatedAt: now,
        }));
        return this.insertMany(data);
    }

    async updateStatus(id: number, status: number): Promise<number> {
        return super.update(id, { status, updatedAt: new Date() });
    }
}