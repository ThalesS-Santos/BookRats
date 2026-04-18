/**
 * ⏱️ Time Formatting Utility
 * Converts total seconds into a readable HH:MM:SS or MM:SS format.
 */
export const formatTime = (totalSeconds) => {
  if (totalSeconds < 0) return "00:00";
  
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};
