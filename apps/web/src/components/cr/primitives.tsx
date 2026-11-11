import React, { useId, useRef } from "react";
import { Icon, IconName } from "./Icon";
import Link from "next/link";

export function Frame({
  children,
  className = "",
  style,
  noPadding,
  web,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  web?: boolean;
}) {
  const classes = [
    "cr-frame",
    "f",
    noPadding ? "cr-frame--flush p0" : "",
    web ? "cr-frame--web w" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}

export function Header({
  title,
  showBack,
  showClose,
  onBack,
  onClose,
  rightAction,
  children,
  className = "",
  style,
}: {
  title?: React.ReactNode;
  showBack?: boolean;
  showClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (children) {
    return (
      <header className={`cr-header hd ${className}`} style={style}>
        {children}
        </header>
    );
  }

  return (
    <header className={`cr-header hd ${className}`} style={style}>
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: "inherit" }}
          aria-label="Back"
        >
          <Icon name="back" className="i" />
        </button>
      ) : showClose ? (
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: "inherit" }}
          aria-label="Close"
        >
          <Icon name="x" className="i" />
        </button>
      ) : (
        <span aria-hidden="true" style={{ width: 20 }} />
      )}

      {title && (
        typeof title === "string" ? <span className="t">{title}</span> : title
      )}

      {rightAction ? (
        rightAction
      ) : (
        <span aria-hidden="true" style={{ width: 20 }} />
      )}
    </header>
  );
}

export function Button({
  children,
  variant = "primary",
  disabled = false,
  large = false,
  className = "",
  style,
  fullWidth = false,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "pill" | "ghost";
  disabled?: boolean;
  large?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  let baseClass = "";
  if (variant === "primary") {
    baseClass = `btn ${disabled ? "off" : ""}`;
  } else if (variant === "pill") {
    baseClass = `pbtn ${large ? "l" : ""} ${disabled ? "off" : ""}`;
  } else if (variant === "ghost") {
    baseClass = `ghost ${large ? "l" : ""}`;
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`cr-button cr-button--${variant} ${large ? "cr-button--large" : ""} ${fullWidth ? "cr-button--full" : ""} ${disabled ? "cr-button--disabled" : ""} ${baseClass} ${className}`.trim()}
      style={{ cursor: disabled ? "not-allowed" : "pointer", ...style }}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  error,
  success,
  type = "text",
  rightIcon,
  rightIconLabel,
  onRightIconClick,
  message,
  inputProps,
  className = "",
  style,
}: {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: boolean;
  success?: boolean;
  type?: string;
  rightIcon?: IconName | React.ReactNode;
  rightIconLabel?: string;
  onRightIconClick?: () => void;
  message?: string;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "placeholder">;
  className?: string;
  style?: React.CSSProperties;
}) {
  const generatedId = useId();
  const inputId = inputProps?.id ?? `cr-input-${generatedId}`;
  const messageId = message ? `${inputId}-message` : undefined;
  const describedBy = [inputProps?.["aria-describedby"], messageId].filter(Boolean).join(" ") || undefined;
  const hasValue = Boolean(value && value.length > 0);
  const inputContainerClass = [
    "in",
    hasValue ? "v" : "",
    error ? "e" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cr-field" style={style}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className={`cr-input ${inputContainerClass}`}>
        <input
          {...inputProps}
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
        />
        {rightIcon && onRightIconClick ? (
          <button
            type="button"
            className="cr-input__action"
            onClick={onRightIconClick}
            aria-label={rightIconLabel ?? "Input action"}
          >
            {typeof rightIcon === "string" ? (
              <Icon name={rightIcon as IconName} className="i" />
            ) : (
              rightIcon
            )}
          </button>
        ) : rightIcon ? (
          <span style={{ display: "flex" }}>
            {typeof rightIcon === "string" ? (
              <Icon name={rightIcon as IconName} className="i" />
            ) : (
              rightIcon
            )}
          </span>
        ) : null}
      </div>
      {message && (
        <div
          id={messageId}
          className={`cr-input__message msg ${error ? "e" : success ? "ok" : ""}`}
          role={error ? "alert" : undefined}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export function Chip({
  label,
  active = false,
  onClick,
  className = "",
}: {
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    onClick ? (
      <button
        type="button"
        className={`cr-chip chip ${active ? "on" : ""} ${className}`.trim()}
        aria-pressed={active}
        onClick={onClick}
      >
        {label}
      </button>
    ) : (
      <span className={`cr-chip chip ${active ? "on" : ""} ${className}`.trim()}>
        {label}
      </span>
    )
  );
}

export function Chips({
  children,
  category = false,
  className = "",
}: {
  children: React.ReactNode;
  category?: boolean;
  className?: string;
}) {
  return (
    <div className={`${category ? "cat" : "chips"} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  label = "Sections",
  className = "",
  style,
}: {
  tabs: { key: T; label: string }[];
  activeTab: T;
  onChange: (key: T) => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    onChange(tabs[nextIndex].key);
  };

  return (
    <div
      className={`cr-tabs tabs ${className}`}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      style={style}
    >
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={tab.key}
          className={activeTab === tab.key ? "a" : ""}
          role="tab"
          aria-selected={activeTab === tab.key}
          tabIndex={activeTab === tab.key ? 0 : -1}
          ref={(element) => { tabRefs.current[index] = element; }}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ListRow({
  icon,
  label,
  sublabel,
  right,
  danger = false,
  onClick,
  className = "",
  style,
}: {
  icon?: IconName | React.ReactNode;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  right?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`cr-list-row lr ${danger ? "dn" : ""} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {icon && (
        <span style={{ marginRight: 10, display: "flex" }}>
          {typeof icon === "string" ? (
            <Icon name={icon as IconName} className="i" />
          ) : (
            icon
          )}
        </span>
      )}
      <div className="l1">
        {label}
        {sublabel && <small>{sublabel}</small>}
      </div>
      {right}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  className = "",
}: {
  on: boolean;
  onChange?: (val: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={!onChange}
      className={`cr-toggle tg ${on ? "on" : ""} ${className}`.trim()}
      onClick={() => onChange?.(!on)}
    />
  );
}

export function Avatar({
  initials,
  gray = false,
  small = false,
  size,
  children,
  label,
  className = "",
  style,
}: {
  initials?: string;
  gray?: boolean;
  small?: boolean;
  size?: number;
  children?: React.ReactNode;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const customStyle: React.CSSProperties = { ...style };
  if (size) {
    customStyle.width = size;
    customStyle.height = size;
    customStyle.fontSize = size * 0.38;
  }

  return (
    <div
      role="img"
      aria-label={label ?? (children ? undefined : initials)}
      className={`cr-avatar a36 ${gray ? "g" : ""} ${small ? "s" : ""} ${className}`.trim()}
      style={customStyle}
    >
      {children || initials}
    </div>
  );
}

export function Sheet({
  children,
  full = false,
  title,
  modal = false,
  className = "",
  style,
}: {
  children: React.ReactNode;
  full?: boolean;
  title?: string;
  modal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={`cr-sheet sheet ${full ? "fl" : ""} ${className}`}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      aria-label={title}
      style={style}
    >
      <div className="grab" aria-hidden="true" />
      {title && <h2 className="cr-sheet__title">{title}</h2>}
      {children}
    </section>
  );
}

export function Banner({
  children,
  variant = "error",
  className = "",
  style,
}: {
  children: React.ReactNode;
  variant?: "error" | "info";
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls = variant === "info" ? "inf" : "banner";
  return (
    <div
      className={`cr-banner ${cls} ${className}`}
      role={variant === "error" ? "alert" : "status"}
      style={style}
    >
      {children}
    </div>
  );
}

export function Toast({
  children,
  variant = "success",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "success" | "error";
  className?: string;
}) {
  return (
    <div
      className={`cr-toast toast cr-toast--${variant} ${className}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      {children}
    </div>
  );
}

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <span className={`cr-skeleton sk ${className}`} style={style} aria-hidden="true" />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const titleId = `cr-empty-state-${useId()}`;

  return (
    <section className={`cr-state ${className}`} aria-labelledby={titleId}>
      {icon && <span className="cr-state__icon" aria-hidden="true">{icon}</span>}
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  icon,
  className = "",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`cr-state cr-state--error ${className}`} role="alert">
      {icon && <span className="cr-state__icon" aria-hidden="true">{icon}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      )}
    </section>
  );
}

export function ProgressBar({
  value,
  label = "Progress",
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div
      className={`cr-progress ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

const bottomNavItems = [
  { label: "Anonymous", href: "/anonymous", icon: "anon" },
  { label: "Room", href: "/room", icon: "room" },
  { label: "Market", href: "/marketplace", icon: "bag" },
  { label: "Me", href: "/me", icon: "user" },
] as const;

export type BottomNavItemLabel = (typeof bottomNavItems)[number]["label"];

export function BottomNav({
  active = "Anonymous",
  onNavigate,
  showRoom = false,
  showMarket = true,
}: {
  active?: BottomNavItemLabel | null;
  onNavigate?: (item: BottomNavItemLabel) => void;
  /** The Room tab is hidden unless the caller says it is available. */
  showRoom?: boolean;
  showMarket?: boolean;
}) {
  return (
    <nav className="cr-bottom-nav" aria-label="Main navigation">
      {bottomNavItems.filter(({ label }) => (showRoom || label !== "Room") && (showMarket || label !== "Market")).map(({ label, href, icon }) => (
        <Link
          key={label}
          href={href}
          className={active === label ? "cr-bottom-nav__item cr-bottom-nav__item--active" : "cr-bottom-nav__item"}
          aria-current={active === label ? "page" : undefined}
          onClick={(event) => {
            if (
              !onNavigate ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            onNavigate(label);
          }}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function DotsProgress({
  total = 3,
  current = 1,
  className = "",
}: {
  total?: number;
  current?: number;
  className?: string;
}) {
  return (
    <div className={`dots ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const cls = step === current ? "a" : step < current ? "b" : "";
        return <i key={i} className={cls} />;
      })}
    </div>
  );
}
