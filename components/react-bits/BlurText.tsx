"use client";

import { motion, Variants } from "framer-motion";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
}

export function BlurText({
  text,
  className = "",
  delay = 0.05,
  animateBy = "words",
  direction = "bottom",
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  const variants: Variants = {
    hidden: {
      filter: "blur(10px)",
      opacity: 0,
      y: direction === "top" ? -12 : 12,
    },
    visible: (i: number) => ({
      filter: "blur(0px)",
      opacity: 1,
      y: 0,
      transition: {
        delay: i * delay,
        duration: 0.4,
        ease: "easeOut",
      },
    }),
  };

  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="inline-block whitespace-pre"
        >
          {el}
          {animateBy === "words" && i < elements.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  );
}
