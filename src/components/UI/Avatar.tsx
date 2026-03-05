export default function Avatar({ size = 36 }: { size?: number }) {
    return (
        <div
            className="avatar"
            style={{ width: size, height: size, minWidth: size }}
        >
            <span className="avatar-letter">L</span>
        </div>
    );
}
