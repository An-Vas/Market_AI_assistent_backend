import { inject, injectable } from 'inversify';
import { TYPES } from '../../types';
import { ISupportRepository } from './support.repository.interface';
import { ISupportService } from './support.service.interface';
import { SupportRequestDto } from './dto/supportRequest.dto';
import { ISessionRepository } from '../session/session.repository.interface';
import { IGatewayService } from '../gateway/gateway.service.interface';
import { MessageEntity, SenderType } from '../messages/entity/message.entity';
import { IMessageRepository } from '../messages/message.repository.interface';
import { SessionEntity, SessionStatus } from '../session/entity/session.entity';
import { ResponseType, SupportResponseDto } from './dto/supportResponse.dto';
import { NeedOrderDetailsCategories, RequestCategory } from '../common/ml.enums';
import { IOrderRepository } from '../order/order.repository.interface';



@injectable()
export class SupportService implements ISupportService {
    constructor(
        @inject(TYPES.supportRepository) private helloRepository: ISupportRepository,
        @inject(TYPES.sessionRepository) private sessionRepository: ISessionRepository,
        @inject(TYPES.gatewayService) private gatewayService: IGatewayService,
        @inject(TYPES.messageRepository) private messageRepository: IMessageRepository,
        @inject(TYPES.orderRepository) private orderRepository: IOrderRepository
    ) {}


    async handleSupportRequest(requestData: SupportRequestDto): Promise<SupportResponseDto>{
        requestData.message = await this.gatewayService.fixSpelling(requestData.message);
        
        const session = await this.handleSession(requestData);
        await this.saveMessage(requestData);

        if (session.messages && session.messages.length >= 3){
            return await this.answerThatSentToOperator(requestData);
        }

        let context = ((session.messages || []).map((item: any) => item.text).join('. ')) + requestData.message;

        const category = await this.gatewayService.getAICategory(context);

        if (!category){
          return await this.answerThatNeedMoreQuestionInfo(requestData);
        } 
        
        if (NeedOrderDetailsCategories.includes(category) && !requestData.orderId){
          console.log("-1-")
                return await this.answerThatNeedOrderInfo(requestData);
        } else if (NeedOrderDetailsCategories.includes(category) && requestData.orderId) {
           console.log("-2-")
                const order = await this.orderRepository.getOrder(requestData.orderId, requestData.userId);
                if (!order)  return await this.answerThatNeedOrderInfo(requestData);
                const orderInfo = " Info about order. Composition is:  " + order.orderComposition + ". Status is: " + order.status + ". Delivery date is " + order.deliveryDate;
                console.log(orderInfo)
                context += orderInfo;
        } else if (category == RequestCategory.human_agent){
           console.log("-3-")
                return await this.answerThatSentToOperator(requestData);
        }
 console.log("-common-")
        return await this.answerAI(requestData, context, category);
        
    }

    async saveMessage(requestData: SupportRequestDto){
        const msg = new MessageEntity(); 
        msg.senderType = SenderType.USER;
        msg.text = requestData.message;
        msg.sessionId = requestData.sessionId;
        const savedMessage = await this.messageRepository.saveMessage(msg);
    }

    async handleSession(requestData: SupportRequestDto): Promise<SessionEntity>{
      let session = await this.sessionRepository.getSession(requestData.sessionId);

        if (!session) {
            session = await this.sessionRepository.createSession(requestData.sessionId, requestData.userId)
        } else if (session.status == SessionStatus.CLOSED){
            await this.sessionRepository.updateStatus(requestData.sessionId, SessionStatus.OPEN);
        }
        
      return session;
    }
    

    async answerThatSentToOperator (requestData: SupportRequestDto): Promise<SupportResponseDto>{
        await this.sessionRepository.updateStatus(requestData.sessionId, SessionStatus.OPERATOR);
            await this.gatewayService.sendToOperator();
            return {
                  type: ResponseType.OPERATOR,
                  text: "Please wait for a response. Your request has been sent to the operator."
            }
    }

    async answerThatNeedOrderInfo (requestData: SupportRequestDto): Promise<SupportResponseDto>{
            return {
                  type: ResponseType.ORDERINFOREQUEST,
                  text: "Please provide or check order Id."
            }
    }

    async answerThatNeedMoreQuestionInfo (requestData: SupportRequestDto): Promise<SupportResponseDto>{
            return {
                  type: ResponseType.DETAILSREQUEST,
                  text: "Please rephrase your question or provide more details."
            }
    }

    async answerAI(requestData: SupportRequestDto, context: string, category: RequestCategory): Promise<SupportResponseDto>{
        const strcategory: string = RequestCategory[category];
        await this.sessionRepository.updateStatus(requestData.sessionId, SessionStatus.CLOSED);
        return {
            type: ResponseType.ORDERINFOREQUEST,
            text: await this.gatewayService.getAIResponse(context, strcategory)
        }
    }
  

}