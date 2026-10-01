export enum ResponseType {
    ANSWER = 1,
    DETAILSREQUEST = 2,
    ORDERINFOREQUEST = 3,
    OPERATOR = 4
}

export class SupportResponseDto {
    public text!: string
    public type!: ResponseType

}