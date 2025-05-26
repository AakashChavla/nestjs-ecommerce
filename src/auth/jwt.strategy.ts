// import { Injectable, UnauthorizedException } from "@nestjs/common";
// import { PassportStrategy } from '@nestjs/passport'
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { UsersService } from "../users/users.service";

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//     constructor(private usersService: UsersService) {
//         super({
//             jwtFromRequest: ExtractJwt.fromAuthHearderAsBearerToken(),
//             ignoreExpiration: false,
//             secretOrkey: 'secretKey',
//         });
//     }

//     async validate(payload: any){
//         const user = await this.usersService.findOneByEmail(payload.email);
//         if(!user){
//             throw new UnauthorizedException();

//         }
//         return user;
//     }
// }

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from "../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Fixed typo here
            ignoreExpiration: false,
            secretOrKey: 'secretKey', // Fixed typo here too
        });
    }

    async validate(payload: any) {
        const user = await this.usersService.findOneByEmail(payload.email);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
