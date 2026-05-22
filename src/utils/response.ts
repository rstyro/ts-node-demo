export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    timestamp: string;
    code?: number;   // 业务状态码
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