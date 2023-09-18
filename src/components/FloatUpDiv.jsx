import { motion } from "framer-motion";

function FloatUpDiv({whileHover = {}, children}) {
  return (
    <motion.div
      variants={{
        offscreen: {
          y: 100,
        },
        onscreen: {
          y: 0,
          transition: {
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