export interface ISupportRepository {
 
  getCounter(): Promise<number>;
}