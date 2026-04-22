import { motion } from 'motion/react';

export default function AutoLoader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        animate={{
          x: [-5, 5, -5],
          y: [-1, 1, -1],
          rotate: [0, -1, 1, 0],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="text-amber-500"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized Auto-Rickshaw Body */}
          <path d="M4 14h14l1 3H3l1-3z" />
          <path d="M5 14V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v5" />
          <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="16" cy="18" r="2" />
          <path d="M19 14l2 3v3h-3" />
        </svg>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-slate-500 font-medium tracking-tight"
      >
        Connecting to India's Ad Network...
      </motion.p>
    </div>
  );
}
