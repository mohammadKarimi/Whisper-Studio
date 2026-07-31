export type MeetingPlatform = 'teams' | 'meet' | 'zoom' | 'webex' | 'unknown'

export interface MeetingStatus {
  inMeeting: boolean
  platform: MeetingPlatform
  confidence: 'high' | 'medium' | 'low'
  source: string[]
}
