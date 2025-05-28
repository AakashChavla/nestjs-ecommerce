export class AuthenticatedUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  profile?: string; // optional
}