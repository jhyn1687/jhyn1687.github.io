import { motion } from "framer-motion";

function FloatUpDiv({className,  whileHover={ rotate: 1, scale: 1.025 }, children}) {
  return (
    <motion.div
      className={className}
      variants={{
        offscreen: {
          opacity: 0,
          y: 100,
        },
        onscreen: {
          opacity: 1,
          y: 0,
          transition: {
            delay: 0.1,
            type: "spring",
            bounce: 0.4,
            duration: 0.8,
          },
        },
      }}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true }}
      whileHover={whileHover}
    >
      {children}
    </motion.div>
  );
}

export default FloatUpDiv;