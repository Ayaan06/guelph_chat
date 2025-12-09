export type MessageDTO = {
  id: string;
  courseId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export type CourseSummary = {
  id: string;
  code: string;
  name: string;
  major: string;
  level: number;
};

export type ClassmateSummary = {
  id: string;
  name: string | null;
};
