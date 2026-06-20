"use client"

import { type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function TemplateActionButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-9 rounded-full px-5 text-xs font-bold",
        "has-data-[icon=inline-start]:pl-4 has-data-[icon=inline-start]:pr-5",
        className
      )}
      {...props}
    />
  )
}
