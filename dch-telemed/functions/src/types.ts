import { Timestamp } from "firebase-admin/firestore";

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface AppointmentVideoMeta {
  provider: "daily";
  roomName: string;
  roomUrl: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface AppointmentDoc {
  type: "online_consultation";
  doctorId: string;
  patientId?: string;
  patientPhone?: string;
  patientName?: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  timezone?: string;
  status: AppointmentStatus;
  video?: AppointmentVideoMeta;
  meetingStartedAt?: Timestamp;
  meetingEndedAt?: Timestamp;
}

export interface JoinGrantDoc {
  appointmentId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
  singleUse: boolean;
}
