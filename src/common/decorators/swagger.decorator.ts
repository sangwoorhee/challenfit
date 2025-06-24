import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PageResDto } from '../dto/res.dto';

// GET 요청에 대한 응답 스키마
export const ApiGetResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [{ $ref: getSchemaPath(model) }],
      },
    }),
  );
};

// POST 요청에 대한 응답 스키마
export const ApiPostResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiCreatedResponse({
      schema: {
        allOf: [{ $ref: getSchemaPath(model) }],
      },
    }),
  );
};

//  GET 요청에 대한 '목록' 형태의 페이징 형식 응답 스키마
export const ApiGetItemsResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageResDto) }, // PageResDto를 모든 스키마의 응답값으로 갖고옴
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) }, // model로 전달받은 데이터 타입
              },
            },
            required: ['items'],
          },
        ],
      },
    }),
  );
};
