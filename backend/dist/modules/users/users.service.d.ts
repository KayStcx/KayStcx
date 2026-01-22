import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    findOneByEmail(email: string): Promise<User | undefined>;
    create(userData: Partial<User>): Promise<User>;
    findOneById(id: string): Promise<User | undefined>;
    update(id: string, userData: Partial<User>): Promise<User | undefined>;
    remove(id: string): Promise<void>;
}
