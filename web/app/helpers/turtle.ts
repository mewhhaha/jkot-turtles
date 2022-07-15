import type { Turtle } from "durable-objects";

export const turtles: Turtle[] = ["blue", "red", "green", "purple", "yellow"];

export const isTurtle = (s: string): s is Turtle =>
  turtles.includes(s as Turtle);
