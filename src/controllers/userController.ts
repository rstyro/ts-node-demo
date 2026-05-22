import { Request, Response } from 'express';
import { ResponseUtil } from '@/utils/response';
import { UserService } from '@/services/userService';

const userService = UserService.getInstance();

export const getUsers = async (_req: Request, res: Response) => {
    const users = await userService.findAll();
    res.json(ResponseUtil.success(users));
};

export const getUserById = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const user = await userService.findById(id);
    res.json(ResponseUtil.success(user));
};

export const createUser = async (req: Request, res: Response) => {
    const { name } = req.body;
    const newUser = await userService.create({ name });
    res.status(201).json(ResponseUtil.success(newUser, 'User created'));
};

export const updateUser = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const { name } = req.body;
    const updatedUser = await userService.update(id, { name });
    res.json(ResponseUtil.success(updatedUser, 'User updated'));
};

export const deleteUser = async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    await userService.delete(id);
    res.json(ResponseUtil.success(null, 'User deleted'));
};