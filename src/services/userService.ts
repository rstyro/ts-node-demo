import { AppError } from '@/utils/AppError';
import { User, CreateUserInput, UpdateUserInput } from '@/types/user';

const users: User[] = [{ id: 1, name: 'Alice' }];

export class UserService {
    private static instance: UserService;

    private constructor() {}

    static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async findAll(): Promise<User[]> {
        return [...users];
    }

    async findById(id: number): Promise<User> {
        const user = users.find(u => u.id === id);
        if (!user) {
            throw new AppError('User not found', 404, true, 'USER_NOT_FOUND');
        }
        return user;
    }

    async create(data: CreateUserInput): Promise<User> {
        if (!data.name || data.name.trim().length === 0) {
            throw new AppError('User name is required', 400, true, 'INVALID_INPUT');
        }

        const existingUser = users.find(u => u.name === data.name.trim());
        if (existingUser) {
            throw new AppError('User already exists', 409, true, 'USER_EXISTS');
        }

        const newUser: User = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            name: data.name.trim(),
        };
        users.push(newUser);
        return newUser;
    }

    async update(id: number, data: UpdateUserInput): Promise<User> {
        const index = users.findIndex(u => u.id === id);
        if (index === -1) {
            throw new AppError('User not found', 404, true, 'USER_NOT_FOUND');
        }

        const name = data.name;
        if (name !== undefined) {
            if (name.trim().length === 0) {
                throw new AppError('User name cannot be empty', 400, true, 'INVALID_INPUT');
            }

            const existingUser = users.find(u => u.name === name.trim() && u.id !== id);
            if (existingUser) {
                throw new AppError('User name already taken', 409, true, 'USER_NAME_EXISTS');
            }

            users[index].name = name.trim();
        }

        return users[index];
    }

    async delete(id: number): Promise<void> {
        const index = users.findIndex(u => u.id === id);
        if (index === -1) {
            throw new AppError('User not found', 404, true, 'USER_NOT_FOUND');
        }
        users.splice(index, 1);
    }
}