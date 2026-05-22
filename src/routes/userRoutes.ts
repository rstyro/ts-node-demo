import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '@/controllers/userController';
import { catchAsync } from '@/utils/catchAsync';

const router = Router();

router.get('/users', catchAsync(getUsers));
router.get('/users/:id', catchAsync(getUserById));
router.post('/users', catchAsync(createUser));
router.put('/users/:id', catchAsync(updateUser));
router.delete('/users/:id', catchAsync(deleteUser));

export default router;