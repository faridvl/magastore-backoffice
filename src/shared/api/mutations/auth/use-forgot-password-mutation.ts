// async function requestPasswordReset(email: string): Promise<{ message: string }> {
//   const { result } = await ApiServiceClient(env.API.AUTH_URL).post('/auth/forgot-password', {
//     email,
//   });
//   return result;
// }

// export function useForgotPasswordMutation(
//   options?: UseAPIMutationOptions,
// ): UseAPIMutationResult<{ message: string }> {
//   const USE_FORGOT_KEY = 'forgotPassword';

//   return useApiMutation({
//     mutationKey: [USE_FORGOT_KEY],
//     mutationFn: (email: any) => requestPasswordReset(email),
//     ...options,
//   });
// }
