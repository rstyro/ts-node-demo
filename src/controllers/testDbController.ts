import { Request, Response } from 'express';
import { ResponseUtil } from '@/utils/response';
import { TestDbService } from '@/services/TestDbService';
import { CreateUserDto, UpdateUserDto } from '@/database/dao/testDbDao';

const testDbService = TestDbService.getInstance();

export const getUsers = async (_req: Request, res: Response) => {
    const users = await testDbService.findAll();
    res.json(ResponseUtil.success(users));
};

export const getUserById = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const user = await testDbService.findById(id);
    res.json(ResponseUtil.success(user));
};

export const getUserByUsername = async (req: Request, res: Response) => {
    const username = String(req.params.username);
    const user = await testDbService.findByUsername(username);
    res.json(ResponseUtil.success(user));
};

export const createUser = async (req: Request, res: Response) => {
    const data: CreateUserDto = req.body;
    const newUser = await testDbService.create(data);
    res.status(201).json(ResponseUtil.success(newUser, 'User created successfully'));
};

export const updateUser = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const data: UpdateUserDto = req.body;
    const updatedUser = await testDbService.update(id, data);
    res.json(ResponseUtil.success(updatedUser, 'User updated successfully'));
};

export const deleteUser = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    await testDbService.delete(id);
    res.json(ResponseUtil.success(null, 'User deleted successfully'));
};

export const updateUserStatus = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;
    const updatedUser = await testDbService.updateStatus(id, status);
    res.json(ResponseUtil.success(updatedUser, 'User status updated successfully'));
};

export const batchCreateUsers = async (req: Request, res: Response) => {
    const users: CreateUserDto[] = req.body;
    const count = await testDbService.batchCreate(users);
    res.status(201).json(ResponseUtil.success({ count }, `${count} users created successfully`));
};