"use client"

// shadcn's base-nova Calendar (react-day-picker), restyled for the pilot app: --app-* tokens, day cells 44 x 48px,
// 60 x 48px from sm: up (plan date-picker-drawer C-28), the selection azure (--app-pick, C-29), the Button's focus
// outline, light only.

import * as React from "react"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "outline",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-app-surface [--cell-radius:var(--app-radius-inner)] [--cell-size:--spacing(11)] sm:[--cell-size:--spacing(15)]",
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-1.5", defaultClassNames.month),
        nav: cn("absolute top-0 right-0 flex items-center gap-2", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-11 p-0 select-none aria-disabled:opacity-40",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-11 p-0 select-none aria-disabled:opacity-40",
          defaultClassNames.button_next
        ),
        month_caption: cn("flex h-11 items-center", defaultClassNames.month_caption),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-app-small font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn("relative rounded-(--cell-radius)", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 bg-app-surface opacity-0", defaultClassNames.dropdown),
        caption_label:
          captionLayout === "label"
            ? `font-heading text-app-title font-bold tracking-[-.015em] text-app-ink select-none ${defaultClassNames.caption_label}`
            : cn(
                "flex items-center gap-1 rounded-(--cell-radius) text-app-small font-semibold text-app-ink select-none [&>svg]:size-3.5 [&>svg]:text-app-muted",
                defaultClassNames.caption_label
              ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex gap-2", defaultClassNames.weekdays),
        weekday: `w-(--cell-size) flex-none font-mono text-app-label font-bold text-app-muted select-none ${defaultClassNames.weekday}`,
        week: cn("mt-2 flex w-full gap-2", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn("text-app-label text-app-muted select-none", defaultClassNames.week_number),
        day: cn(
          "group/day relative h-12 w-(--cell-size) flex-none rounded-(--cell-radius) p-0 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-(--cell-radius) bg-app-inset", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-(--cell-radius) bg-app-inset", defaultClassNames.range_end),
        today: cn("", defaultClassNames.today),
        outside: cn("text-app-muted aria-selected:text-app-muted", defaultClassNames.outside),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          if (orientation === "right") return <ChevronRightIcon className={cn("size-4", className)} {...props} />
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "group/day-button relative isolate z-10 flex size-full flex-col items-center justify-start gap-1 border-0 pt-1.5 text-app-base leading-5 font-normal tabular-nums",
        "group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:outline-2 group-data-[focused=true]/day:outline-offset-2 group-data-[focused=true]/day:outline-ring",
        "data-[run=true]:bg-app-pick-tint data-[selected-single=true]:bg-app-pick data-[selected-single=true]:text-app-on-accent data-[selected-single=true]:hover:bg-app-pick-hover",
        "aria-disabled:cursor-not-allowed aria-disabled:text-app-disabled aria-disabled:hover:bg-transparent aria-disabled:bg-[repeating-linear-gradient(135deg,var(--app-ground)_0_5px,var(--app-inset)_5px_6px)]",
        "data-[end=true]:after:absolute data-[end=true]:after:inset-y-1 data-[end=true]:after:-right-[5px] data-[end=true]:after:w-[3px] data-[end=true]:after:rounded-sm data-[end=true]:after:bg-app-accent",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
