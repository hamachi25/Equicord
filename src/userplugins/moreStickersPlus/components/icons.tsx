/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function IconContainer(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            width: "20px",
            height: "20px",
            boxSizing: "border-box",
            position: "relative",
            cursor: "text"
        }}>
            {props.children}
        </div>
    );
}


export function SearchIcon({ width, height, color }: { width: number, height: number, color: string; }) {
    return (
        <svg role="img" width={width} height={height} viewBox="0 0 24 24">
            <path fill={color} fill-rule="evenodd" clip-rule="evenodd" d="M15.62 17.03a9 9 0 1 1 1.41-1.41l4.68 4.67a1 1 0 0 1-1.42 1.42l-4.67-4.68ZM17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"></path>
        </svg>
    );
}

export function CancelIcon({ width, height, className, color, onClick }: { width: number, height: number, className: string, color: string, onClick: () => void; }) {
    return (
        <svg role="img" width={width} height={height} viewBox="0 0 24 24" className={className} onClick={onClick}>
            <path fill={color} d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z"></path>
        </svg>
    );
}

export function RecentlyUsedIcon({ width, height, color }: { width: number, height: number, color: string; }) {
    return (
        <svg role="img" width={width} height={height} viewBox="0 0 24 24">
            <path d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1-18a1 1 0 1 0-2 0v7c0 .27.1.52.3.7l3 3a1 1 0 0 0 1.4-1.4L13 11.58V5Z" fill={color} fill-rule="evenodd" clip-rule="evenodd"></path>
        </svg>
    );
}

export function CogIcon({ width, height }: { width: number, height: number; }) {
    return (
        <svg role="img" width={width} height={height} viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M19.738 10H22V14H19.739C19.498 14.931 19.1 15.798 18.565 16.564L20 18L18 20L16.565 18.564C15.797 19.099 14.932 19.498 14 19.738V22H10V19.738C9.069 19.498 8.203 19.099 7.436 18.564L6 20L4 18L5.436 16.564C4.901 15.799 4.502 14.932 4.262 14H2V10H4.262C4.502 9.068 4.9 8.202 5.436 7.436L4 6L6 4L7.436 5.436C8.202 4.9 9.068 4.502 10 4.262V2H14V4.261C14.932 4.502 15.797 4.9 16.565 5.435L18 3.999L20 5.999L18.564 7.436C19.099 8.202 19.498 9.069 19.738 10ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"></path>
        </svg>
    );
}
