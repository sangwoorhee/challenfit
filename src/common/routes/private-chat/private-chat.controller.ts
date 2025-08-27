import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
  } from '@nestjs/swagger';
  import { PrivateChatService } from './private-chat.service';
  import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
  import { 
    GetPrivateChatRoomsDto, 
    GetPrivateMessagesDto, 
    CreatePrivateChatRoomDto,
    SendPrivateMessageDto 
  } from './dto/req.dto';
  import { 
    GetPrivateChatRoomsResponseDto, 
    GetPrivateMessagesResponseDto,
    CreatePrivateChatRoomResponseDto 
  } from './dto/res.dto';
  import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
  
  @ApiTags('일대일 채팅')
  @Controller('private-chat')
  export class PrivateChatController {
    constructor(private readonly privateChatService: PrivateChatService) {}
  
    // 1. 일대일 채팅방 목록 조회
    // GET: http://localhost:3000/private-chat/rooms
    @Get('rooms')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
      summary: '일대일 채팅방 목록 조회',
      description: 'GET: http://localhost:3000/private-chat/rooms',
    })
    @ApiResponse({ 
      status: 200, 
      description: '채팅방 목록 조회 성공', 
      type: GetPrivateChatRoomsResponseDto 
    })
    async getPrivateChatRooms(
      @Query() query: GetPrivateChatRoomsDto,
      @User() user: UserAfterAuth,
    ): Promise<GetPrivateChatRoomsResponseDto> {
      const chatRoomsData = await this.privateChatService.getPrivateChatRooms(
        user.idx,
        query.page,
        query.limit,
      );
  
      return {
        result: 'ok',
        chatRooms: chatRoomsData.data,
        pagination: chatRoomsData.pagination,
      };
    }
  
    // 2. 일대일 채팅방 생성 또는 조회
    // POST: http://localhost:3000/private-chat/rooms
    @Post('rooms')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
      summary: '일대일 채팅방 생성 또는 조회',
      description: 'POST: http://localhost:3000/private-chat/rooms',
    })
    @ApiResponse({ 
      status: 201, 
      description: '채팅방 생성/조회 성공', 
      type: CreatePrivateChatRoomResponseDto 
    })
    async createPrivateChatRoom(
      @Body() body: CreatePrivateChatRoomDto,
      @User() user: UserAfterAuth,
    ): Promise<CreatePrivateChatRoomResponseDto> {
      const { chatRoom, isNewRoom } = await this.privateChatService.createOrGetPrivateChatRoom(
        user.idx,
        body.targetUserIdx,
      );
  
      return {
        result: 'ok',
        chatRoom,
        isNewRoom,
      };
    }
  
    // 3. 일대일 채팅 메시지 조회
    // GET: http://localhost:3000/private-chat/rooms/:chatRoomIdx/messages
    @Get('rooms/:chatRoomIdx/messages')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
      summary: '일대일 채팅 메시지 조회',
      description: 'GET: http://localhost:3000/private-chat/rooms/:chatRoomIdx/messages',
    })
    @ApiParam({ name: 'chatRoomIdx', description: '채팅방 IDX', format: 'uuid' })
    @ApiResponse({ 
      status: 200, 
      description: '메시지 조회 성공', 
      type: GetPrivateMessagesResponseDto 
    })
    async getPrivateMessages(
      @Param('chatRoomIdx') chatRoomIdx: string,
      @Query() query: GetPrivateMessagesDto,
      @User() user: UserAfterAuth,
    ): Promise<GetPrivateMessagesResponseDto> {
      const messagesData = await this.privateChatService.getPrivateMessages(
        chatRoomIdx,
        user.idx,
        query.page,
        query.limit,
        query.beforeTimestamp,
      );
  
      return {
        result: 'ok',
        messages: messagesData.data,
        pagination: messagesData.pagination,
        chatRoomIdx,
      };
    }
  
    // 4. 채팅방 메시지 읽음 처리
    // PUT: http://localhost:3000/private-chat/rooms/:chatRoomIdx/read
    @Put('rooms/:chatRoomIdx/read')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
      summary: '채팅방 메시지 읽음 처리',
      description: 'PUT: http://localhost:3000/private-chat/rooms/:chatRoomIdx/read',
    })
    @ApiParam({ name: 'chatRoomIdx', description: '채팅방 IDX', format: 'uuid' })
    @ApiResponse({ status: 200, description: '읽음 처리 성공' })
    async markChatRoomMessagesAsRead(
      @Param('chatRoomIdx') chatRoomIdx: string,
      @User() user: UserAfterAuth,
    ): Promise<any> {
      await this.privateChatService.markChatRoomMessagesAsRead(chatRoomIdx, user.idx);
  
      return {
        result: 'ok',
        message: '메시지 읽음 처리가 완료되었습니다.',
      };
    }
  
    // 5. 메시지 삭제
    // DELETE: http://localhost:3000/private-chat/messages/:messageIdx
    @Delete('messages/:messageIdx')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
      summary: '메시지 삭제',
      description: 'DELETE: http://localhost:3000/private-chat/messages/:messageIdx',
    })
    @ApiParam({ name: 'messageIdx', description: '메시지 IDX', format: 'uuid' })
    @ApiResponse({ status: 200, description: '메시지 삭제 성공' })
    async deletePrivateMessage(
      @Param('messageIdx') messageIdx: string,
      @User() user: UserAfterAuth,
    ): Promise<any> {
      const deletedMessage = await this.privateChatService.deletePrivateMessage(
        messageIdx,
        user.idx,
      );
  
      if (!deletedMessage) {
        throw new HttpException(
          '메시지를 삭제할 수 없습니다.',
          HttpStatus.FORBIDDEN,
        );
      }
  
      return {
        result: 'ok',
        message: '메시지가 삭제되었습니다.',
      };
    }
  }