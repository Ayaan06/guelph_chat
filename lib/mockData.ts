export type Major = {
  id: string;
  name: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  majorId: string;
  level: number;
};

export type UserProfile = {
  name: string;
  email?: string | null;
  majorId: string;
  year: string;
  interests: string[];
  courses?: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

export type ClassMessage = {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
};

export type Classmate = {
  name: string;
  majorId: string;
  year: string;
};

export const majors: Major[] = [
  { id: "cs", name: "Computer Science" },
  { id: "se", name: "Software Engineering" },
  { id: "bio", name: "Biology" },
  { id: "bus", name: "Business" },
  { id: "psyc", name: "Psychology" },
];

export const courses: Course[] = [
  {
    id: "cis1500",
    code: "CIS*1500",
    name: "Introduction to Programming",
    majorId: "cs",
    level: 1000,
  },
  {
    id: "cis2500",
    code: "CIS*2500",
    name: "Intermediate Programming",
    majorId: "cs",
    level: 2000,
  },
  {
    id: "cis3110",
    code: "CIS*3110",
    name: "Operating Systems",
    majorId: "cs",
    level: 3000,
  },
  {
    id: "engr2330",
    code: "ENGR*2330",
    name: "Systems Modeling",
    majorId: "se",
    level: 2000,
  },
  {
    id: "engr4090",
    code: "ENGR*4090",
    name: "Software Architecture",
    majorId: "se",
    level: 4000,
  },
  {
    id: "biol2060",
    code: "BIOL*2060",
    name: "Ecology",
    majorId: "bio",
    level: 2000,
  },
  {
    id: "biol3130",
    code: "BIOL*3130",
    name: "Cell Biology",
    majorId: "bio",
    level: 3000,
  },
  {
    id: "mktg2010",
    code: "MKTG*2010",
    name: "Introduction to Marketing",
    majorId: "bus",
    level: 2000,
  },
  {
    id: "econ2410",
    code: "ECON*2410",
    name: "Intermediate Microeconomics",
    majorId: "bus",
    level: 2000,
  },
  {
    id: "psyc2360",
    code: "PSYC*2360",
    name: "Cognitive Psychology",
    majorId: "psyc",
    level: 2000,
  },
  {
    id: "psyc3240",
    code: "PSYC*3240",
    name: "Social Development",
    majorId: "psyc",
    level: 3000,
  },
];

const joinedCourseIds = ["cis1500", "cis2500", "biol2060", "psyc2360"];

export const joinedCourses: Course[] = courses.filter((course) =>
  joinedCourseIds.includes(course.id),
);

export const mockUserProfile: UserProfile = {
  name: "Jordan Lee",
  email: "jordan.lee@guelph.edu",
  majorId: "cs",
  year: "3rd Year",
  interests: ["Systems", "Design", "Peer Tutoring"],
};

export const classmatesOnline: Classmate[] = [
  { name: "Amina K.", majorId: "cs", year: "2nd Year" },
  { name: "Dev S.", majorId: "cs", year: "3rd Year" },
  { name: "Lena M.", majorId: "se", year: "4th Year" },
  { name: "Noah R.", majorId: "bio", year: "3rd Year" },
];

export const mockMessages: ClassMessage[] = [
  {
    id: "1",
    senderName: "Amina K.",
    content: "Did anyone try the practice midterm? The recursion section felt tricky.",
    timestamp: "10:14 AM",
    isCurrentUser: false,
  },
  {
    id: "2",
    senderName: "You",
    content: "Yeah, I thought so too. I can share a quick outline after class.",
    timestamp: "10:16 AM",
    isCurrentUser: true,
  },
  {
    id: "3",
    senderName: "Dev S.",
    content: "Reminder: assignment 2 deadline moved to next Friday.",
    timestamp: "10:19 AM",
    isCurrentUser: false,
  },
  {
    id: "4",
    senderName: "You",
    content: "Thanks! Anyone up for a study session tomorrow evening?",
    timestamp: "10:20 AM",
    isCurrentUser: true,
  },
];

export const termLabel = "Fall 2025";

export const getMajorById = (majorId: string) =>
  majors.find((major) => major.id === majorId);

export const getCourseById = (courseId: string) =>
  courses.find((course) => course.id === courseId);
