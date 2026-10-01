import { injectable } from 'inversify';
import { ISupportRepository } from './support.repository.interface';



@injectable()
export class SupportRepository implements ISupportRepository {

  async getCounter(): Promise<number> {
    return 1;
  }
}