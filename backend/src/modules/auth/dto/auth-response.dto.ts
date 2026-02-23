export class AuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  metadata?: {
    version: string;
    timestamp: string;
    expiresIn: number;
  };
}
