"use client";

import { useMemo, useState } from "react";

type Props = {
  name: string;
  image: string | null;
  className?: string;
  textClassName?: string;
};

export function UserAvatar({ name, image, className = "", textClassName = "" }: Props) {
  const [imageError, setImageError] = useState(false);
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name],
  );

  const showImage = Boolean(image) && !imageError;

  return (
    <span
      className={`grid place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-100 ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image || ""}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </span>
  );
}
