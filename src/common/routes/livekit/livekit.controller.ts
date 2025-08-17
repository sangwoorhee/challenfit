// import {
//   Controller,
//   Get,
//   Query,
//   BadRequestException,
//   UseGuards,
//   ForbiddenException,
// } from '@nestjs/common';
// import { LivekitService } from './livekit.service';
// import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
// import { ChallengeroomService } from '../challengeroom/challengeroom.service';
// import { ChallengeparticipantService } from '../challengeparticipant/challengeparticipant.service';

// @Controller('livekit')
// export class LivekitController {
//   constructor(
//     private readonly livekit: LivekitService,
//     private readonly challengeService: ChallengeroomService,
//     private readonly particiapntService: ChallengeparticipantService,
//   ) {}

//   @UseGuards(JwtAuthGuard)
//   @Get('token')
//   async getToken(
//     @Query('roomIdx') roomId: string, // challengeRoomIdx
//     @Query('userIdx') userId: string,
//   ) {
//     if (!roomId || !userId) {
//       throw new BadRequestException('roomId, userId는 필수입니다.');
//     }

//     // 1) 방 상태 확인
//     const room = await this.challengeService.getChallengeRoomDetail(roomId);
//     if (!room) throw new ForbiddenException('존재하지 않는 방입니다.');
//     if (room.challengeRoom.status === '종료') {
//       throw new ForbiddenException('도전 기간이 끝났습니다.');
//     }

//     // 2) 참여 여부 확인
//     const isParticipant = room.challengeRoom.members.some(
//       (mem) => mem.user_idx === userId,
//     );
//     if (!isParticipant) {
//       throw new ForbiddenException('보이스채팅은 도전 참여자만 가능합니다.');
//     }

//     // 3) LiveKit 토큰 발급
//     const livekitRoomName = `ch_${roomId}`;
//     return this.livekit.issueToken({
//       roomName: livekitRoomName,
//       identity: userId,
//       ttlSec: 600,
//       canPublish: true,
//       canSubscribe: true,
//     });
//   }
// }
