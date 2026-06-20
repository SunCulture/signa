import { z } from "zod/v3"

export const loginFormSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export const registerFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export const forgotPasswordFormSchema = z.object({
  email: z.string().email("Enter a valid email address."),
})

export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your new password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export const otpFormSchema = z.object({
  otp: z.string().length(6, "Enter your 6-digit code."),
})

export const authFormSchema = z
  .object({
    mode: z.enum([
      "login",
      "register",
      "forgot-password",
      "reset-password",
      "otp",
    ]),
    name: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    otp: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (["login", "register", "forgot-password"].includes(value.mode)) {
      const result = z
        .string()
        .email("Enter a valid email address.")
        .safeParse(value.email)

      if (!result.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid email address.",
          path: ["email"],
        })
      }
    }

    if (value.mode === "register" && !value.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required.",
        path: ["name"],
      })
    }

    if (value.mode === "login" && !value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required.",
        path: ["password"],
      })
    }

    if (
      ["register", "reset-password"].includes(value.mode) &&
      (!value.password || value.password.length < 8)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters.",
        path: ["password"],
      })
    }

    if (
      value.mode === "reset-password" &&
      value.password !== value.confirmPassword
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      })
    }

    if (value.mode === "otp" && value.otp?.length !== 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your 6-digit code.",
        path: ["otp"],
      })
    }
  })

export type LoginFormValues = z.infer<typeof loginFormSchema>
export type RegisterFormValues = z.infer<typeof registerFormSchema>
export type ForgotPasswordFormValues = z.infer<
  typeof forgotPasswordFormSchema
>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>
export type OtpFormValues = z.infer<typeof otpFormSchema>
export type AuthFormValues = z.infer<typeof authFormSchema>
