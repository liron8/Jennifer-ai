"use client";

import type { FC, HTMLAttributes } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Placement } from "@react-types/overlays";
import { ChevronSelectorVertical, LogOut01, Settings01, User01 } from "@untitledui/icons";
import { useFocusManager } from "react-aria";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";
import { useUser } from "@/hooks/useUser";

export const NavAccountMenu = ({
    className,
    ...dialogProps
}: AriaDialogProps & { className?: string }) => {
    const focusManager = useFocusManager();
    const dialogRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const handleSignOut = useCallback(async () => {
        try {
            console.log('Signing out...');
            // Use server-side sign out for more reliable cookie clearing
            const response = await fetch('/api/auth/signout', { method: 'POST' });
            if (response.ok) {
                console.log('Sign out successful, redirecting...');
            }
            // Force full page reload to clear all state
            window.location.href = '/login';
        } catch (err) {
            console.error('Sign out failed:', err);
            // Force redirect even on error
            window.location.href = '/login';
        }
    }, []);

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    focusManager?.focusNext({ tabbable: true, wrap: true });
                    break;
                case "ArrowUp":
                    focusManager?.focusPrevious({ tabbable: true, wrap: true });
                    break;
            }
        },
        [focusManager],
    );

    useEffect(() => {
        const element = dialogRef.current;
        if (element) {
            element.addEventListener("keydown", onKeyDown);
        }

        return () => {
            if (element) {
                element.removeEventListener("keydown", onKeyDown);
            }
        };
    }, [onKeyDown]);

    return (
        <AriaDialog
            {...dialogProps}
            ref={dialogRef}
            className={cx("w-66 rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden", className)}
        >
            <div className="rounded-xl bg-primary ring-1 ring-secondary">
                <div className="flex flex-col gap-0.5 py-1.5">
                    <NavAccountCardMenuItem label="View profile" icon={User01} onClick={() => router.push('/settings/profile')} />
                    <NavAccountCardMenuItem label="Account settings" icon={Settings01} onClick={() => router.push('/settings/profile')} />
                </div>
            </div>

            <div className="pt-1 pb-1.5">
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="group/item w-full cursor-pointer px-1.5 focus:outline-hidden"
                >
                    <div className="flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover">
                        <div className="flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                            <LogOut01 className="size-5 text-fg-quaternary" /> Sign out
                        </div>
                    </div>
                </button>
            </div>
        </AriaDialog>
    );
};

const NavAccountCardMenuItem = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    ...buttonProps
}: {
    icon?: FC<{ className?: string }>;
    label: string;
    shortcut?: string;
    onClick?: () => void;
} & HTMLAttributes<HTMLButtonElement>) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`MenuItem clicked: ${label}`);
        if (onClick) {
            onClick();
        }
    };

    return (
        <button 
            type="button"
            onClick={handleClick}
            {...buttonProps} 
            className={cx("group/item w-full cursor-pointer px-1.5 focus:outline-hidden", buttonProps.className)}
        >
            <div
                className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover pointer-events-none",
                    // Focus styles.
                    "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
                )}
            >
                <div className="flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                    {Icon && <Icon className="size-5 text-fg-quaternary" />} {label}
                </div>

                {shortcut && (
                    <kbd className="flex rounded px-1 py-px font-body text-xs font-medium text-tertiary ring-1 ring-secondary ring-inset">{shortcut}</kbd>
                )}
            </div>
        </button>
    );
};

export const NavAccountCard = ({
    popoverPlacement,
}: {
    popoverPlacement?: Placement;
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");
    const { profile } = useUser();

    const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
    const email = profile?.email || '';
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : (email ? email[0].toUpperCase() : 'U');

    return (
        <div ref={triggerRef} className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
            <AvatarLabelGroup
                size="md"
                src={profile?.avatar_url}
                initials={initials}
                title={displayName}
                subtitle={email}
                status="online"
            />

            <div className="absolute top-1.5 right-1.5">
                <AriaDialogTrigger>
                    <AriaButton className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover pressed:text-fg-quaternary_hover">
                        <ChevronSelectorVertical className="size-4 shrink-0" />
                    </AriaButton>
                    <AriaPopover
                        placement={popoverPlacement ?? (isDesktop ? "right bottom" : "top right")}
                        triggerRef={triggerRef}
                        offset={8}
                        className={({ isEntering, isExiting }) =>
                            cx(
                                "origin-(--trigger-anchor-point) will-change-transform",
                                isEntering &&
                                    "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                                isExiting &&
                                    "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                            )
                        }
                    >
                        <NavAccountMenu />
                    </AriaPopover>
                </AriaDialogTrigger>
            </div>
        </div>
    );
};
