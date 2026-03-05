export default function Avatar({ size = 36 }: { size?: number }) {
    // Scale the inner icon proportionally to the avatar size
    const iconSize = Math.round(size * 0.5);

    return (
        <div
            className="avatar"
            style={{ width: size, height: size, minWidth: size }}
        >
            <span className="avatar-icon">
                <svg
                    width={iconSize}
                    height={iconSize}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* AI Sparkle Icon */}
                    <path
                        d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                        fill="white"
                        fillOpacity="0.95"
                    />
                </svg>
            </span>
        </div>
    );
}
