import { z } from "zod";

export const emailValidator = z.string().trim().email();
export const passwordValidator = z.string().min(8).max(128);
export const nameValidator = z.string().trim().min(1).max(100);
export const optionalStringValidator = z.string().trim().min(1).optional();
export const isoDateValidator = z.coerce.date();

export function oneOfEnum<TEnum extends Record<string, string>>(enumObject: TEnum) {
  return z.nativeEnum(enumObject);
}

export function maxLengthString(max: number) {
  return z.string().trim().min(1).max(max);
}

export function numericRange(min: number, max: number) {
  return z.number().min(min).max(max);
}
