export interface User {
  id?: number;
  username: string;
  password?: string;
  fullName?: string;
  email?: string;
  role: "admin" | "student";
}

export interface Game {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  path: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  games?: Game[];
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  level: string;
  description: string;
  chapters: Chapter[];
}
