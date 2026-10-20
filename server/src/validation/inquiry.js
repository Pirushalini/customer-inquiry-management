import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{4,15}$/;

/**
 * Validation schema for creating a new inquiry.
 * Enforces non-empty strings, whitespace trimming, reasonable maximum lengths,
 * and valid contact information (email or phone).
 */
export const createInquirySchema = z.object({
  customer_name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(1, { message: 'Customer name cannot be empty' })
    .max(150, { message: 'Customer name must be at most 150 characters' }),
  contact: z
    .string({ required_error: 'Contact information is required' })
    .trim()
    .min(3, { message: 'Contact information must be at least 3 characters' })
    .max(150, { message: 'Contact information must be at most 150 characters' })
    .refine(
      (val) => emailRegex.test(val) || phoneRegex.test(val),
      { message: 'Contact must be a valid email address or phone number' }
    ),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(1, { message: 'Subject cannot be empty' })
    .max(200, { message: 'Subject must be at most 200 characters' }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, { message: 'Description cannot be empty' })
    .max(5000, { message: 'Description must be at most 5000 characters' })
});

/**
 * Validation schema for updating status with optimistic concurrency version check.
 */
export const updateStatusSchema = z.object({
  status: z.enum(['New', 'In Progress', 'Resolved'], {
    errorMap: () => ({ message: "Status must be 'New', 'In Progress', or 'Resolved'" })
  }),
  version: z
    .number({
      required_error: 'Expected version is required for optimistic concurrency control',
      invalid_type_error: 'Version must be a number'
    })
    .int({ message: 'Version must be an integer' })
    .min(1, { message: 'Version must be at least 1' })
});

/**
 * Helper to validate positive integer URL parameters (e.g. :id).
 * Returns the parsed integer or null if invalid.
 */
export function parseIdParam(param) {
  const parsed = Number(param);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
