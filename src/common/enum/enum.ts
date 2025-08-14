// 도전방 상태
export enum ChallengeStatus {
  PENDING = '대기중',
  ONGOING = '진행중',
  COMPLETED = '종료',
}

// 도전 유저 상태
export enum ChallengerStatus {
  PENDING = '대기중',
  ONGOING = '진행중',
  COMPLETED = '종료',
}

// 유저
export enum UserProvider {
  LOCAL = 'local',
  KAKAO = 'kakao',
  NAVER = 'naver',
  APPLE = 'apple',
  GOOGLE = 'google',
}

// 유저 상태
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

// 구독 결제 상태
export enum SubscriptionPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 구독플랜 상태
export enum SubscriptionPlanType {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PRO = 'pro',
}

// 구독 상태
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// 로그인방법
export enum LoginMethod {
  EMAIL = 'email',
  KAKAO = 'kakao',
  NAVER = 'naver',
  GOOGLE = 'google',
  AUTO = 'auto', // 자동 로그인
}

// 푸시 알림 타입
export enum NotificationType {
  SYSTEM = 'system',
  CHALLENGE = 'challenge',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  ETC = 'etc',
}

// 도전 기간 단위
export enum DurationUnit {
  DAY = '일',
  WEEK = '주',
  MONTH = '개월',
}

// 팔로우 요청 상태
export enum FollowRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// 채팅 메시지 타입
export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM_PARTICIPATE = 'system_participate', // 참여 시스템 메시지
  SYSTEM_LEAVE = 'system_leave', // 나감 시스템 메시지
  SYSTEM_START = 'system_start', // 도전 시작 시스템 메시지
  SYSTEM_END = 'system_end', // 도전 종료 시스템 메시지
}