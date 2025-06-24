import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, IsInt } from 'class-validator';

// 회원가입 요청 DTO
export class SignupReqDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  name: string;

  @IsString()
  nickname: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  weight?: number;

  @IsOptional()
  @IsString()
  interest_exercises?: string;

  @IsOptional()
  @IsString()
  exercise_purpose?: string;

  @IsOptional()
  @IsString()
  introduction?: string;

  @IsOptional()
  @IsString()
  profile_image_url?: string;

  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;

  @IsOptional()
  @IsBoolean()
  no_push_alert?: boolean;
}

// 로그인 
export class LoginReqDto {
    @IsEmail()
    email: string;
  
    @IsString()
    @IsNotEmpty()
    password: string;
  }