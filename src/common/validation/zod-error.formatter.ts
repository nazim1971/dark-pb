import { ValidationError } from "class-validator";
import { ZodError } from "zod";

export interface FormattedValidationIssue {
  path: string;
  message: string;
  code: string;
}

export function formatZodError(error: ZodError): FormattedValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
    code: issue.code,
  }));
}

export function formatClassValidatorErrors(
  errors: ValidationError[],
  parentPath = "",
): FormattedValidationIssue[] {
  const formatted: FormattedValidationIssue[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [code, message] of Object.entries(error.constraints)) {
        formatted.push({
          path,
          message,
          code,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      formatted.push(...formatClassValidatorErrors(error.children, path));
    }
  }

  return formatted;
}
