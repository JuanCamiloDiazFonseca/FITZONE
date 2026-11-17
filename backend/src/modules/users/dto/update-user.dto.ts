import { IsEmail, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  document?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email?: string;
}
