import { notifyAdmins, notifyUser } from "../_core/sse";

export function notifyPixRequestCreated(data: {
  requestId: number;
  employeeName: string;
  newPixKey: string;
  createdAt: string;
}) {
  notifyAdmins({
    type: "pix_request_created",
    data,
  });
}

export function notifyPixRequestReviewed(data: {
  requestId: number;
  employeeName: string;
  status: "aprovado" | "rejeitado";
  reviewedByUserId: number;
  reviewNotes?: string;
  reviewedAt: string;
}) {
  notifyUser(data.reviewedByUserId, {
    type: "pix_request_reviewed",
    data,
  });
}

export function notifyAttendanceClosed(data: {
  scheduleId: number;
  clientName: string;
  totalPeople: number;
  leaderId: number;
}) {
  notifyAdmins({
    type: "attendance_closed",
    data,
  });
}

export function notifyDuplicateAllocationDetected(data: {
  employeeId: number;
  employeeName: string;
  date: string;
  conflictingScheduleId: number;
}) {
  notifyAdmins({
    type: "duplicate_allocation_detected",
    data,
  });
}
