/**
 * API Utilities
 * Common utilities for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: ApiError, status: number) {
  return NextResponse.json({ error }, { status });
}

export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse({ code: 'UNAUTHORIZED', message }, 401);
}

export function forbiddenResponse(message = 'Insufficient permissions') {
  return errorResponse({ code: 'FORBIDDEN', message }, 403);
}

export function notFoundResponse(resource = 'Resource') {
  return errorResponse({ code: 'NOT_FOUND', message: `${resource} not found` }, 404);
}

export function validationErrorResponse(details: Record<string, unknown>) {
  return errorResponse(
    { code: 'VALIDATION_ERROR', message: 'Invalid request data', details },
    400
  );
}

export function conflictResponse(message: string) {
  return errorResponse({ code: 'CONFLICT', message }, 409);
}

export function internalErrorResponse(message = 'Internal server error') {
  return errorResponse({ code: 'INTERNAL_ERROR', message }, 500);
}

export function badRequestResponse(message: string) {
  return errorResponse({ code: 'BAD_REQUEST', message }, 400);
}

export function parseZodError(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  
  return errors;
}

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: validationErrorResponse(parseZodError(error)),
      };
    }
    return {
      data: null,
      error: badRequestResponse('Invalid JSON body'),
    };
  }
}

export function parseQueryParams(url: string): Record<string, string> {
  const { searchParams } = new URL(url);
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

export function parsePaginationParams(params: Record<string, string>) {
  return {
    page: Math.max(1, parseInt(params.page || '1', 10)),
    pageSize: Math.min(100, Math.max(1, parseInt(params.page_size || '20', 10))),
  };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}
