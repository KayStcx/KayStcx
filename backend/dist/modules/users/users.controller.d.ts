import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findOne(id: string): Promise<import("./entities/user.entity").User | undefined>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<import("./entities/user.entity").User | undefined>;
    remove(id: string): Promise<void>;
}
