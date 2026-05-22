export interface User {
    id: number;
    name: string;
}

export interface CreateUserInput {
    name: string;
}

export interface UpdateUserInput {
    name?: string;
}