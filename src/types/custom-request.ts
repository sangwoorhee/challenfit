import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: {
    idx: string;
    email: string;
    name: string;
  };
}
