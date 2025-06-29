// 도전방 상태
export enum ChallengeStatus {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

// 도전 유저 상태
export enum ChallengerStatus {
  PENDING = 'pending',
  PARTICIPATING = 'participating',
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