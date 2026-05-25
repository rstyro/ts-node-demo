import { TestDbDao, User, CreateUserDto, UpdateUserDto } from "@/database/dao/testDbDao";
import { AppError } from '@/utils/AppError';

export class TestDbService {
    private static instance: TestDbService;
    private testDbDao = new TestDbDao();

    private constructor() {}

    static getInstance(): TestDbService {
        if (!TestDbService.instance) {
            TestDbService.instance = new TestDbService();
        }
        return TestDbService.instance;
    }

    async findAll(): Promise<User[]> {
        return this.testDbDao.findAll({
            conditions: { status: 1 },
            where: [{ field: 'age', operator: '>', value: 18 }],
            orderBy: [{ field: 'create_time', direction: 'DESC' }],
            limit: 10,
            offset: 0,
        });
    }

    async findById(id: number): Promise<User> {
        const user = await this.testDbDao.findOne<User>({ id });
        if (!user) {
            throw new AppError('User not found', 404, true, 'USER_NOT_FOUND');
        }
        return user;
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.testDbDao.findByUsername(username);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.testDbDao.findByEmail(email);
    }

    async create(data: CreateUserDto): Promise<User> {
        if (!data.username || !data.password) {
            throw new AppError('Username and password are required', 400, true, 'INVALID_INPUT');
        }

        const exists = await this.testDbDao.existsByUsername(data.username);
        if (exists) {
            throw new AppError('Username already exists', 409, true, 'USERNAME_EXISTS');
        }

        return this.testDbDao.create(data);
    }

    async update(id: number, data: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        if (data.username && data.username !== user.username) {
            const exists = await this.testDbDao.existsByUsername(data.username, id);
            if (exists) {
                throw new AppError('Username already taken', 409, true, 'USERNAME_TAKEN');
            }
        }

        await this.testDbDao.update(id, data);
        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);
        await this.testDbDao.update(id, { status: 2 });
    }

    async updateStatus(id: number, status: number): Promise<User> {
        await this.findById(id);
        await this.testDbDao.updateStatus(id, status);
        return this.findById(id);
    }

    async batchCreate(users: CreateUserDto[]): Promise<number> {
        for (const user of users) {
            if (!user.username || !user.password) {
                throw new AppError('Username and password are required', 400, true, 'INVALID_INPUT');
            }
            const exists = await this.testDbDao.existsByUsername(user.username);
            if (exists) {
                throw new AppError(`Username ${user.username} already exists`, 409, true, 'USERNAME_EXISTS');
            }
        }
        return this.testDbDao.batchCreate(users);
    }
}