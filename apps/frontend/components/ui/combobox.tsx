"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

type ComboboxContextValue = {
  inputValue: string
  isOpen: boolean
  onInputValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onValueChange?: (value: string) => void
  value: string
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext() {
  const context = React.useContext(ComboboxContext)

  if (!context) {
    throw new Error("Combobox components must be used within Combobox")
  }

  return context
}

function Combobox({
  children,
  inputValue,
  onInputValueChange,
  onValueChange,
  value,
}: {
  children: React.ReactNode
  inputValue: string
  items?: string[]
  onInputValueChange: (value: string) => void
  onValueChange?: (value: string) => void
  value: string
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick)

    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [])

  return (
    <ComboboxContext.Provider
      value={{
        inputValue,
        isOpen,
        onInputValueChange,
        onOpenChange: setIsOpen,
        onValueChange,
        value,
      }}
    >
      <div className="relative" ref={wrapperRef}>
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

function ComboboxInput({
  className,
  onKeyDown,
  placeholder,
  showTrigger = true,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  showTrigger?: boolean
}) {
  const context = useComboboxContext()

  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupInput
        onChange={(event) => {
          context.onInputValueChange(event.target.value)
          context.onOpenChange(true)
        }}
        onFocus={() => context.onOpenChange(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        value={context.inputValue}
        {...props}
      />
      {showTrigger ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Show folders"
            onClick={() => context.onOpenChange(!context.isOpen)}
            size="icon-xs"
            variant="ghost"
          >
            <ChevronDownIcon className="pointer-events-none" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}

function ComboboxContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const context = useComboboxContext()

  if (!context.isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-xl border border-[var(--auth-input-border)] bg-popover text-popover-foreground shadow-lg",
        className,
      )}
      data-slot="combobox-content"
    >
      {children}
    </div>
  )
}

function ComboboxList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("max-h-64 overflow-y-auto p-1", className)}>
      {children}
    </div>
  )
}

function ComboboxGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function ComboboxLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
      {children}
    </div>
  )
}

function ComboboxItem({
  children,
  value,
}: {
  children: React.ReactNode
  value: string
}) {
  const context = useComboboxContext()
  const isSelected = context.value === value

  return (
    <button
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
      onClick={() => {
        context.onInputValueChange(value)
        context.onValueChange?.(value)
        context.onOpenChange(false)
      }}
      type="button"
    >
      <span className="truncate">{children}</span>
      {isSelected ? <CheckIcon className="size-4 shrink-0" /> : null}
    </button>
  )
}

function ComboboxEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-3 text-center text-sm text-muted-foreground">{children}</div>
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
}
