import { isEmail, isURL } from 'validator';

export function validateEmail(email: string): boolean {
  return isEmail(email);
}

export function validateURL(url: string): boolean {
  return isURL(url);
}

export function validateRequiredFields(fields: Record<string, any>): boolean {
  return Object.values(fields).every(value => value !== null && value !== undefined && value !== '');
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}