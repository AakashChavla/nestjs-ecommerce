import {IsEmail, IsNotEmpty, Min, MinLength} from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email:string;

    @IsNotEmpty()
    @MinLength(6)
    password:string;

    @IsNotEmpty()
    role:string;
}