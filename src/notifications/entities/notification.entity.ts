import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationCategory {
    ORDER = 'order',
    PROMOTION = 'promotion',
    SYSTEM = 'system',
    OTP = 'otp',
    DASHBOARD = 'dashboard',
    PASSWORD = 'password'

}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: NotificationCategory })
    category: NotificationCategory;

    @Column()
    message: string;

    @ManyToOne(() => User, user => user.notifications)
    user: User;

    @Column({ default: false })
    read: boolean;

    @CreateDateColumn()
    CreatedAt: Date;

    @UpdateDateColumn()
    readAt: Date;
}