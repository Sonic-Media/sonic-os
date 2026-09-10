import { getDataSourceErrorMessage, runOnApi } from "@/lib/data-source/context-api";

export type AwaitedMutationResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function runAwaitedMutation<T>(
  operation: () => Promise<T>
): Promise<AwaitedMutationResult<T>> {
  try {
    const data = await runOnApi(operation);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getDataSourceErrorMessage(error),
    };
  }
}
