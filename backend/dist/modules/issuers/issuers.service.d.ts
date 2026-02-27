import { Repository } from 'typeorm';
import { Issuer } from './entities/issuer.entity';
import { CreateIssuerDto } from './dto/create-issuer.dto';
export declare class IssuersService {
    private readonly issuerRepo;
    constructor(issuerRepo: Repository<Issuer>);
    createIssuer(dto: CreateIssuerDto): Promise<Issuer>;
    removeIssuer(id: string): Promise<Issuer>;
    listIssuers(): Promise<Issuer[]>;
    incrementCertificateCount(issuerId: string): Promise<void>;
}
