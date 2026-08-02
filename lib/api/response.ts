import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/api/errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Validation failed.",
          code: "validation_error",
          details: error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  console.error("[api]", error);

  return NextResponse.json(
    {
      error: {
        message: "Unexpected server error.",
        code: "internal_error",
      },
    },
    { status: 500 }
  );
}
