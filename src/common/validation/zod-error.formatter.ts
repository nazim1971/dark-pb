import { ZodError } from "zod";

export interface FormattedZodIssue {
  path: string;
  message: string;
  code: string;
}

export function formatZodError(error: ZodError): FormattedZodIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
    code: issue.code,
  }));
}
