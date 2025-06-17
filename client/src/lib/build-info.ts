// Auto-generated build information - increments with each modification
const generateBuildInfo = () => {
  const now = new Date();
  const buildDate = now.toISOString().split('T')[0].replace(/-/g, '');
  const buildTime = now.toTimeString().split(' ')[0].replace(/:/g, '');
  
  // Get stored build number from localStorage or start at 1
  const storedBuildNumber = typeof window !== 'undefined' ? 
    parseInt(localStorage.getItem('tradesync_build_number') || '1') : 1;
  
  return {
    version: "1.0",
    buildNumber: storedBuildNumber,
    timestamp: now.toISOString(),
    date: buildDate,
    time: buildTime,
    get fullVersion() {
      return `${this.version}_${this.date}_${this.time}_B${this.buildNumber}`;
    },
    increment() {
      this.buildNumber += 1;
      const newNow = new Date();
      this.timestamp = newNow.toISOString();
      this.date = newNow.toISOString().split('T')[0].replace(/-/g, '');
      this.time = newNow.toTimeString().split(' ')[0].replace(/:/g, '');
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('tradesync_build_number', this.buildNumber.toString());
      }
    }
  };
};

export const BUILD_INFO = generateBuildInfo();

// Auto-increment build number on each app load/modification
if (typeof window !== 'undefined') {
  BUILD_INFO.increment();
}