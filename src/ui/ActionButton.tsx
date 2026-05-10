import { motion, type HTMLMotionProps } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { LucideIcon } from "lucide-react";

type Props = PropsWithChildren<HTMLMotionProps<"button"> & {
  className?: string;
  icon?: LucideIcon;
  busy?: boolean;
}>;

export function ActionButton({ children, className, icon: Icon, busy = false, ...props }: Props) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={className ? `action-button ${className}` : "action-button"}
      {...props}
    >
      {busy ? <LoaderCircle size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  );
}
