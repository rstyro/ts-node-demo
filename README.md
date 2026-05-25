# 使用 Node.js + TypeScript 构建可扩展的后端项目：完整指南

- TypeScript 为 Node.js 带来了静态类型、现代 ES 特性以及卓越的 IDE 支持，尤其适合构建大型、可维护的后端应用。
- 从零搭建一个企业级 Node.js + TypeScript 项目，涵盖**初始化、配置、开发、统一响应格式、全局异常处理、调试、测试、构建及部署**全流程。

---

## 1. 项目初始化

### 1.1 创建项目目录
```bash
mkdir ts-node-demo
cd ts-node-demo
```

### 1.2 初始化 `package.json`
```bash
npm init -y
```
可根据需要修改 `name`、`version`、`description`。

### 1.3 安装核心依赖
```bash
# npm install express dotenv cors helmet
pnpm add express dotenv cors helmet
```
- `express`：Web 框架
- `dotenv`：环境变量管理
- `cors`：跨域支持
- `helmet`：安全头设置

### 1.4 安装 TypeScript 及开发依赖
```bash
# 用哪个命令都行
# npm install -D typescript @types/node @types/express @types/cors @types/helmet  ts-node nodemon rimraf concurrently
  
pnpm add -D typescript @types/node @types/express @types/cors @types/helmet ts-node nodemon rimraf concurrently
```
- `typescript`：TypeScript 编译器
- `@types/*`：对应库的类型定义
- `ts-node`：直接运行 `.ts`（开发用）
- `nodemon`：热重启
- `rimraf`：跨平台删除目录
- `concurrently`：并行运行脚本

---

## 2. 配置 TypeScript
- 创建一个 tsconfig.json文件的，告诉 TypeScript 如何编译你的 TS 项目
- tsconfig.json文件可以理解为 TypeScript 的“总配置文件”

生成 `tsconfig.json`：
```bash
npx tsc --init
```

推荐配置（Node.js 18+）：

```json
{
  "compilerOptions": {
    /* 基本选项 */
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "node",

    /* 严格模式 (推荐) */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,

    /* 模块解析 */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    /* 调试 & 构建 */
    "sourceMap": true,
    "declaration": false,
    "removeComments": true,
    "incremental": true,

    /* 其他 */
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

> 如需使用 ES Modules，可将 `"module"` 改为 `"ESNext"` 或 `"Node16"`，并相应调整 `"moduleResolution"`。

---

## 3. 项目结构

推荐按功能模块划分：

```
my-ts-node-app/
├── src/
│   ├── config/           # 配置加载（环境变量、数据库等）
│   ├── controllers/      # 路由处理函数
│   ├── middleware/       # 自定义中间件（含全局异常处理）
│   ├── models/           # 数据模型（Prisma/TypeORM/Mongoose）
│   ├── routes/           # 路由定义
│   ├── services/         # 业务逻辑层
│   ├── utils/            # 辅助工具（统一响应、自定义错误类、catchAsync）
│   ├── types/            # 全局 TS 类型/接口
│   ├── app.ts            # Express 应用配置
│   └── server.ts         # 启动入口
├── tests/                # 单元测试与集成测试
├── dist/                 # 编译输出（自动生成）
├── .env                  # 环境变量（不提交）
├── .env.example          # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. 编写应用核心代码

### 4.1 环境配置 (`src/config/index.ts`)
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  // 可添加数据库URL、JWT密钥等
};
```

### 4.2 统一响应格式 (`src/utils/response.ts`)

为保证所有接口返回结构一致，定义标准 API 响应格式及工具函数。

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  code?: number;   // 业务状态码（可选）
}

export class ResponseUtil {
  static success<T>(data: T, message = 'Success', code = 200): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, code = 500, data?: any): ApiResponse {
    return {
      success: false,
      message,
      data,
      code,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 4.3 自定义业务异常 (`src/utils/AppError.ts`)

用于在业务逻辑中抛出可预测的错误，便于全局处理。

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;   // 如 'USER_NOT_FOUND'

  constructor(message: string, statusCode = 500, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 4.4 异步异常捕获辅助函数 (`src/utils/catchAsync.ts`)

避免在每个异步路由控制器中重复写 `try-catch`。

```typescript
import { Request, Response, NextFunction } from 'express';

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
```

### 4.5 Express 应用配置 (`src/app.ts`)

包含中间件、路由、404 处理以及**全局异常捕获**。

```typescript
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { ResponseUtil } from './utils/response';
import { AppError } from './utils/AppError';
// 导入路由（稍后定义）
// import userRoutes from './routes/userRoutes';

const app: Application = express();

// 全局中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json(ResponseUtil.success({ status: 'ok' }, 'Service healthy'));
});

// 业务路由（示例）
// app.use('/api/users', userRoutes);

// 404 处理（未匹配到路由）
app.use((req: Request, res: Response) => {
  res.status(404).json(ResponseUtil.error('Resource not found', 404));
});

// 全局异常捕获中间件（必须放在所有路由和中间件之后）
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 记录错误（生产环境建议使用 winston 等日志库）
  console.error('Global error caught:', err);

  if (err instanceof AppError) {
    // 已知业务异常：根据状态码返回统一格式
    return res.status(err.statusCode).json(
      ResponseUtil.error(err.message, err.statusCode, { code: err.code })
    );
  }

  // 未知系统异常（如数据库连接失败、语法错误等）
  const isProduction = config.nodeEnv === 'production';
  const message = isProduction ? 'Internal Server Error' : err.message;
  const data = isProduction ? undefined : { stack: err.stack };

  return res.status(500).json(ResponseUtil.error(message, 500, data));
});

export default app;
```

### 4.6 启动服务器 (`src/server.ts`)

```typescript
import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### 4.7 示例模块（用户）

**路由** (`src/routes/userRoutes.ts`)：
```typescript
import { Router } from 'express';
import { getUsers, createUser } from '../controllers/userController';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

router.get('/', catchAsync(getUsers));
router.post('/', catchAsync(createUser));

export default router;
```

**控制器** (`src/controllers/userController.ts`)：
```typescript
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response';
import { UserService } from '../services/userService';

export const getUsers = async (req: Request, res: Response) => {
  const users = await UserService.findAll();
  res.json(ResponseUtil.success(users));
};

export const createUser = async (req: Request, res: Response) => {
  const { name } = req.body;
  const newUser = await UserService.create({ name });
  res.status(201).json(ResponseUtil.success(newUser, 'User created'));
};
```

**服务层** (`src/services/userService.ts`)：
```typescript
import { AppError } from '../utils/AppError';

// 模拟数据存储
const users = [{ id: 1, name: 'Alice' }];

export class UserService {
  static async findAll() {
    return users;
  }

  static async create(data: { name: string }) {
    const newUser = { id: users.length + 1, name: data.name };
    users.push(newUser);
    return newUser;
  }

  static async findById(id: number) {
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new AppError('User not found', 404, true, 'USER_NOT_FOUND');
    }
    return user;
  }
}
```

此时，若在控制器中调用 `UserService.findById` 且用户不存在，会抛出 `AppError`，最终被全局异常捕获器捕获并返回统一错误格式。

---

## 5. 开发工作流与 NPM 脚本

在 `package.json` 的 `scripts` 字段中添加：

```json
"scripts": {
  "build": "rimraf dist && tsc",
  "start": "node dist/server.js",
  "dev": "nodemon --exec ts-node src/server.ts",
  "dev:watch": "concurrently \"tsc --watch\" \"nodemon dist/server.js\"",
  "clean": "rimraf dist",
  "type-check": "tsc --noEmit",
  "lint": "eslint src --ext .ts",
  "format": "prettier --write \"src/**/*.ts\"",
  "test": "jest"
}
```

- **`npm run build`**：清理并编译 TypeScript 到 `dist/`。
- **`npm start`**：运行编译后的生产代码。
- **`npm run dev`**：使用 `ts-node` 直接运行，配合 `nodemon` 热重启。
- **`npm run dev:watch`**：分离编译和运行，适合较大项目。
- **`npm run type-check`**：仅类型检查，不输出文件。

---

## 6. 代码规范与格式化（ESLint + Prettier）

### 6.1 安装依赖
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

### 6.2 ESLint 配置 (`.eslintrc.js`)
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint'],
  env: { node: true, es2022: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off'
  }
};
```

### 6.3 Prettier 配置 (`.prettierrc`)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 6.4 添加格式化命令
```json
"scripts": {
  "lint": "eslint src --ext .ts --fix",
  "format": "prettier --write \"src/**/*.ts\""
}
```

---

## 7. 调试配置（VS Code）

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug with ts-node",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/server.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug built app",
      "program": "${workspaceFolder}/dist/server.js",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

> 确保 `tsconfig.json` 中 `"sourceMap": true`。

---

## 8. 测试（Jest + Supertest）

### 8.1 安装测试工具
```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

### 8.2 Jest 配置 (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts']
};
```

### 8.3 编写测试 (`tests/app.test.ts`)
```typescript
import request from 'supertest';
import app from '../src/app';

describe('App', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Resource not found');
  });
});
```

### 8.4 测试脚本
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

---

## 9. 构建与生产部署

### 9.1 构建项目
```bash
npm run build
```
生成 `dist/` 目录，包含编译后的 JavaScript 文件。

### 9.2 生产启动
```bash
NODE_ENV=production node dist/server.js
```

### 9.3 使用 PM2（推荐）
```bash
npm install -g pm2
pm2 start dist/server.js --name my-app
pm2 save
pm2 startup
```

### 9.4 Docker 化（可选）

**Dockerfile**：
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

构建并运行：
```bash
docker build -t my-ts-node-app .
docker run -p 3000:3000 my-ts-node-app
```

---

## 10. 常见问题与最佳实践

### 10.1 路径别名

- 如果希望使用 `@/utils/logger` 代替相对路径（例如 `../../utils/logger`），可以通过 TypeScript 的路径映射配合 `tsconfig-paths` 实现

**步骤：**

1. **配置 `tsconfig.json`** 在 `compilerOptions` 中添加 `baseUrl` 和 `paths`：

```json
 {
   "compilerOptions": {
     "paths": {
       "@/*": ["./src/*"]
     }
   }
 }
```

2. **安装 `tsconfig-paths`**（开发依赖）：

```bash
pnpm add -D tsconfig-paths
```

3. **在开发环境使用 `ts-node` 时注册路径解析**  

修改 `package.json` 中的 `dev` 脚本：
```json
"scripts": {
"dev": "nodemon --exec ts-node -r tsconfig-paths/register src/server.ts"
}
```

其中`-r tsconfig-paths/register` 会在运行时读取 `tsconfig.json` 中的 `paths` 配置，并解析别名。

4. **在生产环境（编译后）使用路径别名**  
由于编译后的 JavaScript 文件中的别名路径不会被 Node.js 原生识别，需要做以下处理：
- 安装tsc-alias

```bash
# 使用 npm
npm install -D tsc-alias

# 使用 pnpm
pnpm add -D tsc-alias

# 使用 yarn
yarn add -D tsc-alias
```

修改打包命令补充`tsc-alias`：

```json
"scripts": {
  "build": "rimraf dist && tsc && tsc-alias",
},

```

5. **示例代码中使用别名**

```typescript
// 原来：import logger from '../../utils/logger';
import logger from '@/utils/logger';
```


### 10.2 环境变量类型安全
可定义一个接口并在 `config/index.ts` 中校验：
```typescript
interface Env {
  PORT: string;
  DB_URL: string;
}
// 使用 zod 或 joi 校验
```

### 10.3 日志记录

生产环境建议使用 `winston` 或 `pino` 替代 `console.log`。本项目已集成 `winston` 日志库。

#### 安装依赖
```bash
pnpm add winston
```

#### 创建日志工具类 (`src/utils/logger.ts`)
```typescript
import winston, { Logger, format, transports } from 'winston';
import { config } from '@/config';

const { combine, timestamp, printf, colorize, json } = format;

/**
 * 自定义日志格式
 */
const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaString = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
    return `${ts} [${level}]: ${message}${metaString}`;
});

/**
 * 创建 Winston Logger 实例
 */
const log: Logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    /**
     * 默认附加字段
     * 用于标识日志来源
     */
    defaultMeta: { service: config.name },
    /**
     * 全局日志格式
     * - 所有日志都会带时间戳
     */
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    /**
     * 日志输出目标（transports）
     */
    transports: [
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), json())
        }),
        new transports.File({
            filename: 'logs/combined.log',
            format: combine(timestamp(), json())
        })
    ]
});

/**
 * 开发环境额外配置
 *
 * - 输出到控制台
 * - 彩色显示
 * - 人类可读格式
 */
if (config.nodeEnv !== 'production') {
    log.add(
        new transports.Console({
            format: combine(
                timestamp(),
                colorize(),   // 彩色级别（info / error / warn）
                logFormat     // 自定义文本格式
            )
        })
    );
}

export { log };
```

#### 使用方式
```typescript
import { log } from '@/utils/logger';

log.debug('调试信息');
log.info('一般信息');
log.warn('警告信息');
log.error('错误信息');
```

#### 日志特性
- **环境适配**：开发环境彩色控制台输出，生产环境 JSON 格式输出
- **级别控制**：生产环境 `info` 级别，开发环境 `debug` 级别
- **持久化**：自动写入 `logs/error.log`（仅错误）和 `logs/combined.log`（全部）

#### 在应用中集成
在 `src/app.ts` 全局异常处理中使用：
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error('Global error caught:', { error: err.message, stack: err.stack });
  // ...
});
```

在 `src/server.ts` 服务启动时使用：
```typescript
const server = app.listen(config.port, () => {
    log.info('服务启动成功', { url: `http://localhost:${config.port}` });
});
```

### 10.4 数据库集成（mysql2）

本项目已集成 `mysql2` 作为数据库驱动，采用连接池模式，提供完整的 CRUD 操作封装和事务支持。

#### 10.4.1 安装依赖

```bash
pnpm add mysql2
```

#### 10.4.2 配置数据库连接

在 `.env` 文件中配置数据库参数：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=demo
DB_CONNECTION_LIMIT=10
```

#### 10.4.3 配置文件更新

在 `src/config/index.ts` 中添加数据库配置：

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.NAME || 'TS-NODE-DEMO',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'demo',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
};
```

#### 10.4.4 项目结构

```
src/
└── database/
    ├── connection.ts    # 数据库连接池和基础操作
    ├── db.ts            # Database 类封装（CRUD）
    ├── index.ts         # 导出模块
    └── dao/             # 数据访问对象
        └── testDbDao.ts # 用户表 DAO 示例
```

#### 10.4.5 核心模块说明

**连接池模块** (`src/database/connection.ts`)：

- 创建 MySQL 连接池，支持命名占位符
- 提供 `query`、`execute`、`transaction` 等基础方法
- 自动管理连接的获取和释放

**数据库操作封装** (`src/database/db.ts`)：

- `Database` 类提供通用 CRUD 操作
- 支持复杂查询条件、排序、分页
- 支持事务操作

**DAO 层** (`src/database/dao/testDbDao.ts`)：

- 继承 `Database` 类，针对特定表封装方法
- 实现业务相关的数据访问逻辑

#### 10.4.6 使用示例

**创建 DAO 类**：

```typescript
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

export class UserDao extends Database {
    constructor() {
        super('user');
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.findOne<User>({ username });
    }

    async create(data: { username: string; password: string }): Promise<User> {
        const now = new Date();
        return this.insert<User>({
            ...data,
            status: 1,
            create_time: now,
            updated_time: now,
        });
    }
}
```

**服务层调用**：

```typescript
import { UserDao, User } from '@/database/dao/userDao';
import { AppError } from '@/utils/AppError';

export class UserService {
    private userDao = new UserDao();

    async findAll(): Promise<User[]> {
        return this.userDao.findAll({
            conditions: { status: 1 },
            where: [{ field: 'age', operator: '>', value: 18 }],
            orderBy: [{ field: 'create_time', direction: 'DESC' }],
            limit: 10,
            offset: 0,
        });
    }

    async createUser(username: string, password: string): Promise<User> {
        const exists = await this.userDao.exists({ username });
        if (exists) {
            throw new AppError('Username already exists', 409, true, 'USERNAME_EXISTS');
        }
        return this.userDao.create({ username, password });
    }
}
```

#### 10.4.7 事务操作

```typescript
import { transaction } from '@/database/connection';

const result = await transaction(async (connection) => {
    // 在事务中执行多个操作
    await connection.execute('INSERT INTO orders ...', {...});
    await connection.execute('UPDATE inventory ...', {...});
    return { success: true };
});
```

#### 10.4.8 数据库表初始化

创建 `user` 表的 SQL 脚本：

```sql
CREATE TABLE `user` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    `password` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
    `email` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
    `age` int DEFAULT NULL,
    `status` int DEFAULT '0',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
```

#### 10.4.9 数据库路由示例

项目已提供完整的用户 CRUD 路由：

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/:id` | 根据 ID 获取用户 |
| GET | `/api/users/username/:username` | 根据用户名获取用户 |
| POST | `/api/users` | 创建用户 |
| POST | `/api/users/batch` | 批量创建用户 |
| PUT | `/api/users/:id` | 更新用户信息 |
| PATCH | `/api/users/:id/status` | 更新用户状态 |
| DELETE | `/api/users/:id` | 删除用户（软删除） |


## 11. 总结

自此，你已经搭建了一个**生产就绪的 Node.js + TypeScript 后端项目骨架**，包含以下关键能力：

- ✅ 完整的 TypeScript 配置与类型安全
- ✅ 统一的 API 响应格式（`ResponseUtil`）
- ✅ 标准化的业务异常处理（`AppError`）
- ✅ 全局异常捕获中间件（区分业务与系统错误）
- ✅ 异步路由自动异常传递（`catchAsync`）
- ✅ 开发热重载、调试、代码规范、测试
- ✅ Winston 日志记录（文件持久化 + 环境适配）

你可以在此基础上快速集成数据库、身份验证、API 文档（Swagger）等功能，构建可靠的后端服务。

**下一步行动**：
- 阅读 [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- 探索 [TypeScript 官方手册](https://www.typescriptlang.org/docs/)
- 学习 [Express 高级模式](https://expressjs.com/en/advanced/best-practice-performance.html)

Happy Coding! 🚀