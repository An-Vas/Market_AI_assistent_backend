import { RequestCategory } from "../common/ml.enums";
import { IGatewayService } from "./gateway.service.interface";
import axios from 'axios';
import 'dotenv/config';

export class GatewayService implements IGatewayService{
    async getAIResponse(context: string, category: string): Promise<string>{
        try {
            console.log('Запрос на генерацию на ' + `${process.env.FASTAPI_HOST}/assistant/generate-answer`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/generate-answer`, {
                text: context,
            });
            
            const answer = response.data?.content;
            console.log('Ответ на запрос генерации:');
            console.log(response.data);
            return answer;
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            return "Error aqcuired, try again. ";
        }
    }

    async getAICategory(context: string,): Promise<RequestCategory | null>{

        try {
            console.log('Запрос на классификацию на ' + `${process.env.FASTAPI_HOST}/assistant/classify`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/classify`, {
                text: context,
            });
            
            const foundCategory = response.data?.category;
            if (response.data?.confidence > 0.85){
                return RequestCategory[foundCategory as keyof typeof RequestCategory]
            }
            console.log('Ответ на запрос классификации:');
            console.log(response.data);

            return null;
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            return null;
        }
    }

    async fixSpelling(text: string): Promise<string>{
        try {
             console.log('Запрос на исправление орфографии на ' + `${process.env.FASTAPI_HOST}/assistant/process`);
            const response = await axios.post(`${process.env.FASTAPI_HOST}/assistant/process`, {
                text: text,
            });

            console.log('Ответ на запрос исправления орфографии:');
            console.log(response.data);
            
            return response.data?.processed || text
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log('Ошибка запроса:');
                console.log('Status:', error.response?.status);
                console.log('Data:', error.response?.data);
            } else {
                console.log(error);
            }
            return text
        }
    }

    async sendToOperator(): Promise<void>{
        console.log("Передано оператору")
    }

}