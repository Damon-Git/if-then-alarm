export const formatSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export const formatDurationLabel = (seconds: number) => {
  if (seconds % 60 === 0) {
    return `${seconds / 60} 分钟`;
  }

  return `${seconds} 秒`;
};
