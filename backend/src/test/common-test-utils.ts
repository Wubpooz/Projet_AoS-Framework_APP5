export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const flushAsync = async (ticks = 2): Promise<void> => {
  for (let i = 0; i < ticks; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};
