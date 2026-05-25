import { Router } from 'express';
import { getUsers, getUserById, getUserByUsername, createUser, updateUser, deleteUser, updateUserStatus, batchCreateUsers } from '@/controllers/testDbController';
import { catchAsync } from '@/utils/catchAsync';

const router = Router();

router.get('/users', catchAsync(getUsers));
router.get('/users/:id', catchAsync(getUserById));
router.get('/users/username/:username', catchAsync(getUserByUsername));
router.post('/users', catchAsync(createUser));
router.post('/users/batch', catchAsync(batchCreateUsers));
router.put('/users/:id', catchAsync(updateUser));
router.patch('/users/:id/status', catchAsync(updateUserStatus));
router.delete('/users/:id', catchAsync(deleteUser));

export default router;