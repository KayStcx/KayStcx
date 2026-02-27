import { IssuersService } from './issuers.service';
import { CreateIssuerDto } from './dto/create-issuer.dto';
export declare class IssuersController {
    private readonly issuersService;
    constructor(issuersService: IssuersService);
    create(dto: CreateIssuerDto): Promise<import("./entities/issuer.entity").Issuer>;
    remove(id: string): Promise<import("./entities/issuer.entity").Issuer>;
    list(): Promise<import("./entities/issuer.entity").Issuer[]>;
}
