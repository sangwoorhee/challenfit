import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: {
    member_seq: number;
    member_id: string;
  };
}
