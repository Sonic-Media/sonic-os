export const SHOP_OPEN_HOUR = 9;
export const SHOP_CLOSE_HOUR = 23;

export function isWithinOpeningHours(date = new Date()): boolean {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const openMinutes = SHOP_OPEN_HOUR * 60;
  const closeMinutes = SHOP_CLOSE_HOUR * 60;
  return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
}

export function getOpeningHoursLabel(): string {
  return "9:00 AM – 11:00 PM";
}

export function getOpeningHoursStatus(date = new Date()): {
  canOpen: boolean;
  message: string;
} {
  if (isWithinOpeningHours(date)) {
    return {
      canOpen: true,
      message: "Ready to open today's shop.",
    };
  }

  const hour = date.getHours();
  if (hour < SHOP_OPEN_HOUR) {
    return {
      canOpen: false,
      message: `Opening hours start at ${SHOP_OPEN_HOUR}:00 AM.`,
    };
  }

  return {
    canOpen: false,
    message: "Shop opening hours have ended for today.",
  };
}
