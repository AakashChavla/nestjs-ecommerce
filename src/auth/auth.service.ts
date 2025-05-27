import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(email: string, password: string) {
        try {
            const user = await this.usersService.findByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new UnauthorizedException('Invalid email or password');
            }

            const payload = { sub: user.id, email: user.email, role: user.role };
            const token = this.jwtService.sign(payload);

            const { password: _, ...userWithoutPassword } = user;
            user.token = token;
            await this.usersService.updateToken(user.id, token);

            return {
                statusCode: HttpStatus.OK,
                message: 'Login successful',
                data: {
                    access_token: token,
                    user: userWithoutPassword,
                },
            };
        } catch (error) { 
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error during login',
                error: error.message,
            };
        }
    }

}
