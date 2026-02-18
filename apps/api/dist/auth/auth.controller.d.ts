import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            tenantId: string;
            email: string;
            name: string | null;
            status: string;
            createdAt: Date;
        };
    }>;
}
