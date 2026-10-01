import {  IsInt, IsNotEmpty, IsOptional, MaxLength, MinLength } from "class-validator"


export class SupportRequestDto {
    @IsInt()
    @IsNotEmpty()
    public userId!: number;
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(300)
    public message!: string;
    @IsInt()
    @IsNotEmpty()
    public sessionId!: number;
    @IsInt()
    @IsOptional()
    public orderId!: number;
}